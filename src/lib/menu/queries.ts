/**
 * Menu queries. Public menu reads use the anon key (guarded by RLS: anon only
 * sees available items). Safe to call server-side (SSR) or from the browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MenuCategory, MenuItem } from "../types";

function anonClient(): SupabaseClient {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

/**
 * The full customer-facing menu: categories in order, each with its available
 * items. Empty categories are dropped.
 */
export async function getCustomerMenu(): Promise<MenuCategoryWithItems[]> {
  const supabase = anonClient();
  const [cats, items] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("sort_order"),
  ]);

  const categories = (cats.data ?? []) as MenuCategory[];
  const menuItems = (items.data ?? []) as MenuItem[];

  return categories
    .map((c) => ({ ...c, items: menuItems.filter((i) => i.category_id === c.id) }))
    .filter((c) => c.items.length > 0);
}

/** A flat list of all available items (for search/filter on the client). */
export async function getAvailableItems(): Promise<MenuItem[]> {
  const supabase = anonClient();
  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_available", true)
    .order("sort_order");
  return (data ?? []) as MenuItem[];
}
