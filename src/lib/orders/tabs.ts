/**
 * Tabs — a table session groups the rounds a table orders across one visit, so
 * the bill is collective while each round stays its own kitchen ticket. A table
 * has at most one open tab (enforced by a partial unique index); the second
 * round for that table joins it. Runs with whichever client the caller passes:
 * the service-role client from order creation, or the authenticated staff
 * client from the billing surfaces.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TabStatus } from "../types";
import { computeBill, type BillTotals } from "../billing";

/**
 * The id of the open tab for a table — reusing the existing one or opening a
 * fresh one. Null when there's no table (a standalone order) or the tab
 * couldn't be resolved (the order then simply lands without a tab).
 */
export async function resolveOpenTab(
  supabase: SupabaseClient,
  tableLabel: string | null,
): Promise<string | null> {
  if (!tableLabel) return null;

  const open = await findOpenTab(supabase, tableLabel);
  if (open) return open;

  const { data: created, error } = await supabase
    .from("tabs")
    .insert({ table_label: tableLabel, status: "open" })
    .select("id")
    .single();

  if (!error && created) return created.id as string;

  // 23505 = another round opened the tab first; re-read the winner.
  if ((error as { code?: string } | null)?.code === "23505") {
    return findOpenTab(supabase, tableLabel);
  }
  return null;
}

async function findOpenTab(
  supabase: SupabaseClient,
  tableLabel: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("tabs")
    .select("id")
    .eq("table_label", tableLabel)
    .eq("status", "open")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// --- Billing (staff surfaces) ------------------------------------------------

export interface OpenTabSummary {
  id: string;
  table_label: string;
  order_count: number;
  subtotal: number;
  opened_at: string;
}

export interface TabBillLine {
  name: string;
  qty: number;
  price: number;
}

export interface TabBill {
  id: string;
  table_label: string;
  status: TabStatus;
  opened_at: string;
  closed_at: string | null;
  lines: TabBillLine[];
  round_count: number;
  totals: BillTotals;
}

/** Open tabs with a running total, for the /staff/tabs list. Oldest first. */
export async function getOpenTabs(supabase: SupabaseClient): Promise<OpenTabSummary[]> {
  const { data, error } = await supabase
    .from("tabs")
    .select("id, table_label, opened_at, orders ( subtotal, status )")
    .eq("status", "open")
    .order("opened_at", { ascending: true });

  if (error || !data) return [];

  return data.map((t) => {
    const billable = (t.orders ?? []).filter(
      (o: { status: string }) => o.status !== "cancelled",
    );
    return {
      id: t.id as string,
      table_label: t.table_label as string,
      opened_at: t.opened_at as string,
      order_count: billable.length,
      subtotal: billable.reduce((s: number, o: { subtotal: number }) => s + Number(o.subtotal), 0),
    };
  });
}

/**
 * The collective bill for a tab: every non-cancelled round's items merged by
 * name+price, with GST + service totals. Null if the tab doesn't exist.
 */
export async function getTabBill(
  supabase: SupabaseClient,
  tabId: string,
): Promise<TabBill | null> {
  const { data, error } = await supabase
    .from("tabs")
    .select(
      "id, table_label, status, opened_at, closed_at, " +
        "orders ( status, order_items ( name_snapshot, price_snapshot, qty ) )",
    )
    .eq("id", tabId)
    .maybeSingle();

  if (error || !data) return null;

  const merged = new Map<string, TabBillLine>();
  let subtotal = 0;
  let round_count = 0;

  for (const o of (data.orders ?? []) as {
    status: string;
    order_items: { name_snapshot: string; price_snapshot: number; qty: number }[];
  }[]) {
    if (o.status === "cancelled") continue;
    round_count += 1;
    for (const i of o.order_items ?? []) {
      const price = Number(i.price_snapshot);
      subtotal += price * i.qty;
      const key = `${i.name_snapshot}@@${price}`;
      const existing = merged.get(key);
      if (existing) existing.qty += i.qty;
      else merged.set(key, { name: i.name_snapshot, price, qty: i.qty });
    }
  }

  return {
    id: data.id as string,
    table_label: data.table_label as string,
    status: data.status as TabStatus,
    opened_at: data.opened_at as string,
    closed_at: data.closed_at as string | null,
    lines: [...merged.values()],
    round_count,
    totals: computeBill(subtotal),
  };
}

/** Close a tab at payment. Idempotent; guarded so only an open tab closes. */
export async function closeTab(
  supabase: SupabaseClient,
  tabId: string,
  byUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: tab } = await supabase
    .from("tabs")
    .select("id, status")
    .eq("id", tabId)
    .maybeSingle();

  if (!tab) return { ok: false, error: "Tab not found." };
  if (tab.status === "closed") return { ok: true };

  const { error } = await supabase
    .from("tabs")
    .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: byUserId })
    .eq("id", tabId)
    .eq("status", "open");

  if (error) return { ok: false, error: "Couldn't close the tab — please retry." };
  return { ok: true };
}
