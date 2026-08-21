/**
 * Tabs — a table session groups the rounds a table orders across one visit, so
 * the bill is collective while each round stays its own kitchen ticket. A table
 * has at most one open tab (enforced by a partial unique index); the second
 * round for that table joins it. Runs with whichever client the caller passes:
 * the service-role client from order creation, or the authenticated staff
 * client from the billing surfaces.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

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
