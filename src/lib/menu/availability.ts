/**
 * Menu availability (the 86 / sold-out toggle). Kitchen and managers flip a
 * dish's availability; the change hides it from the customer menu on the next
 * load. Reads use the authenticated staff client (staff see every item, sold
 * out or not). Writes go through the set_item_availability() RPC, which is
 * security-definer and role-checks kitchen/manager in the database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AvailabilityItem {
  id: string;
  name: string;
  is_available: boolean;
}
export interface AvailabilityCategory {
  id: string;
  name: string;
  items: AvailabilityItem[];
}

/** Every menu item (available or not), grouped by category, for the 86 panel. */
export async function getKitchenMenu(
  supabase: SupabaseClient,
): Promise<AvailabilityCategory[]> {
  const [cats, items] = await Promise.all([
    supabase.from("menu_categories").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, name, category_id, is_available, sort_order")
      .order("sort_order"),
  ]);

  const categories = (cats.data ?? []) as { id: string; name: string }[];
  const menuItems = (items.data ?? []) as {
    id: string;
    name: string;
    category_id: string;
    is_available: boolean;
  }[];

  return categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      items: menuItems
        .filter((i) => i.category_id === c.id)
        .map((i) => ({ id: i.id, name: i.name, is_available: i.is_available })),
    }))
    .filter((c) => c.items.length > 0);
}

/** Flip one item's availability via the role-checked RPC. */
export async function setAvailability(
  supabase: SupabaseClient,
  itemId: string,
  available: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("set_item_availability", {
    item: itemId,
    available,
  });
  if (error) {
    const msg = /not authoris/i.test(error.message)
      ? "Not permitted for your role."
      : "Couldn't update availability — please retry.";
    return { ok: false, error: msg };
  }
  return { ok: true };
}
