/**
 * Kitchen board queries. All staff can see and complete orders, so these run
 * through the authenticated client (RLS: staff-only). The board shows active
 * orders (confirmed ones a server has taken) and the kitchen marks each one
 * complete in a single step — no intermediate preparing/ready stages.
 *
 * `waited_min` is computed server-side and handed to the island as data, so the
 * island never touches the clock during render (which would desync SSR vs
 * hydration). The page and the poll endpoint share this serializer, so a ticket
 * looks identical however it arrived.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus } from "../types";

/** Statuses that belong on the board (a served/cancelled ticket drops off). */
export const ACTIVE_STATUSES: OrderStatus[] = ["confirmed", "preparing", "ready"];

export interface KitchenLine {
  name: string;
  qty: number;
  notes: string | null;
}

export interface KitchenOrder {
  code: string;
  table_label: string | null;
  status: OrderStatus;
  waited_min: number;
  notes: string | null;
  items: KitchenLine[];
}

export type CompleteResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; error: string };

/** The active queue, oldest first (FIFO). Empty on any read error. */
export async function getActiveKitchenOrders(
  supabase: SupabaseClient,
): Promise<KitchenOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "code, table_label, status, created_at, confirmed_at, notes, " +
        "order_items ( name_snapshot, qty, notes )",
    )
    .in("status", ACTIVE_STATUSES)
    .order("confirmed_at", { ascending: true });

  if (error || !data) return [];

  const now = Date.now();
  return data.map((o) => {
    const since = new Date(o.confirmed_at ?? o.created_at).getTime();
    return {
      code: o.code as string,
      table_label: o.table_label as string | null,
      status: o.status as OrderStatus,
      waited_min: Math.max(0, Math.floor((now - since) / 60000)),
      notes: o.notes as string | null,
      items: (o.order_items ?? []).map(
        (i: { name_snapshot: string; qty: number; notes: string | null }) => ({
          name: i.name_snapshot,
          qty: i.qty,
          notes: i.notes,
        }),
      ),
    };
  });
}

/** Mark a ticket complete (any active status → served). Idempotent. */
export async function completeOrder(
  supabase: SupabaseClient,
  code: string,
): Promise<CompleteResult> {
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: "Couldn't reach that order — please retry." };
  if (!order) return { ok: false, error: "No order with that code." };
  if (order.status === "served") return { ok: true, status: "served" };
  if (!ACTIVE_STATUSES.includes(order.status as OrderStatus)) {
    return { ok: false, error: `Can't complete an order that's ${order.status}.` };
  }

  // Guard on an active status in the WHERE so two stations can't double-apply.
  const { data: updated, error: upErr } = await supabase
    .from("orders")
    .update({ status: "served" })
    .eq("id", order.id)
    .in("status", ACTIVE_STATUSES)
    .select("status")
    .maybeSingle();

  if (upErr) return { ok: false, error: "Couldn't update — please retry." };
  if (!updated) return { ok: true, status: "served" };
  return { ok: true, status: "served" };
}
