/**
 * Customer-facing order tracking. Reads an order by its code with the
 * service-role client (customers have no direct DB access) and reduces the full
 * status machine down to what a customer needs to see:
 *
 *   waiting   — sent, not yet accepted by a server (show the code + QR)
 *   placed    — a server accepted it (anything past `pending`)
 *   cancelled — a server cancelled it
 *
 * The kitchen's finer states (preparing / ready / served) are staff concerns;
 * the customer only cares that their order is now in.
 */
import { supabaseAdmin } from "../supabase/admin";

export type CustomerOrderState = "waiting" | "placed" | "cancelled";

export interface TrackedLine {
  name: string;
  qty: number;
  price: number;
}

export interface TrackedOrder {
  code: string;
  table_label: string | null;
  state: CustomerOrderState;
  subtotal: number;
  notes: string | null;
  items: TrackedLine[];
}

/** Collapse the DB status enum to the three customer-visible states. */
export function toCustomerState(status: string): CustomerOrderState {
  if (status === "pending") return "waiting";
  if (status === "cancelled") return "cancelled";
  return "placed";
}

/** Full order for the tracking page; null if the code doesn't exist. */
export async function getTrackedOrder(code: string): Promise<TrackedOrder | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "code, table_label, status, subtotal, notes, order_items ( name_snapshot, price_snapshot, qty )",
    )
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return null;

  const items = (data.order_items ?? []).map(
    (i: { name_snapshot: string; price_snapshot: number; qty: number }) => ({
      name: i.name_snapshot,
      qty: i.qty,
      price: Number(i.price_snapshot),
    }),
  );

  return {
    code: data.code,
    table_label: data.table_label,
    state: toCustomerState(data.status),
    subtotal: Number(data.subtotal),
    notes: data.notes,
    items,
  };
}

/** Just the live state — for the polling endpoint. null if unknown code. */
export async function getOrderState(code: string): Promise<CustomerOrderState | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("status")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return null;
  return toCustomerState(data.status);
}
