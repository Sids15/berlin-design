/**
 * Manager menu administration — dish and category CRUD. All writes run through
 * the caller's authenticated client, so Postgres RLS enforces manager-only
 * ("manager writes items/categories"). Deleting a dish keeps historical order
 * snapshots (order_items.menu_item_id is ON DELETE SET NULL); deleting a
 * non-empty category is blocked here (its items would cascade away).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VegType } from "../types";

const VEG_TYPES: VegType[] = ["veg", "non_veg", "egg"];

export interface AdminItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  veg_type: VegType;
  tags: string[];
  is_available: boolean;
  is_signature: boolean;
  sort_order: number;
}
export interface AdminCategory {
  id: string;
  name: string;
  sort_order: number;
  items: AdminItem[];
}
export interface ItemInput {
  name: string;
  description: string | null;
  price: number;
  veg_type: VegType;
  tags: string[];
  is_signature: boolean;
  is_available: boolean;
  category_id: string;
  sort_order: number;
}

type Result = { ok: true } | { ok: false; error: string };

/** All categories (ordered) with every item (available or not), for the panel. */
export async function getAdminMenu(supabase: SupabaseClient): Promise<AdminCategory[]> {
  const [cats, items] = await Promise.all([
    supabase.from("menu_categories").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, veg_type, tags, is_available, is_signature, sort_order")
      .order("sort_order"),
  ]);

  const categories = (cats.data ?? []) as Omit<AdminCategory, "items">[];
  const menuItems = (items.data ?? []) as AdminItem[];

  return categories.map((c) => ({
    ...c,
    items: menuItems
      .filter((i) => i.category_id === c.id)
      .map((i) => ({ ...i, price: Number(i.price) })),
  }));
}

export interface CategoryOption {
  id: string;
  name: string;
}
export async function getCategoryOptions(supabase: SupabaseClient): Promise<CategoryOption[]> {
  const { data } = await supabase.from("menu_categories").select("id, name").order("sort_order");
  return (data ?? []) as CategoryOption[];
}

/** One dish for the edit form; null if it's gone. */
export async function getItem(supabase: SupabaseClient, id: string): Promise<AdminItem | null> {
  const { data } = await supabase
    .from("menu_items")
    .select("id, category_id, name, description, price, veg_type, tags, is_available, is_signature, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as AdminItem), price: Number(data.price) };
}

/** Validate + normalise a dish form into an ItemInput. */
export function parseItemForm(form: FormData): { ok: true; value: ItemInput } | { ok: false; error: string } {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "A dish name is required." };

  const price = Number(form.get("price"));
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Enter a valid price (0 or more)." };

  const veg_type = String(form.get("veg_type") ?? "veg") as VegType;
  if (!VEG_TYPES.includes(veg_type)) return { ok: false, error: "Pick a valid veg type." };

  const category_id = String(form.get("category_id") ?? "").trim();
  if (!category_id) return { ok: false, error: "Pick a category." };

  const tags = String(form.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
  const description = String(form.get("description") ?? "").trim();

  return {
    ok: true,
    value: {
      name: name.slice(0, 120),
      description: description ? description.slice(0, 500) : null,
      price: Math.round(price * 100) / 100,
      veg_type,
      tags,
      is_signature: form.get("is_signature") === "on",
      is_available: form.get("is_available") === "on",
      category_id,
      sort_order: Math.floor(Number(form.get("sort_order")) || 0),
    },
  };
}

export async function createItem(supabase: SupabaseClient, v: ItemInput): Promise<Result> {
  const { error } = await supabase.from("menu_items").insert(v);
  return error ? { ok: false, error: "Couldn't create the dish — please retry." } : { ok: true };
}
export async function updateItem(supabase: SupabaseClient, id: string, v: ItemInput): Promise<Result> {
  const { error } = await supabase.from("menu_items").update(v).eq("id", id);
  return error ? { ok: false, error: "Couldn't save the dish — please retry." } : { ok: true };
}
export async function deleteItem(supabase: SupabaseClient, id: string): Promise<Result> {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  return error ? { ok: false, error: "Couldn't delete the dish — please retry." } : { ok: true };
}

// --- Categories --------------------------------------------------------------

export async function createCategory(supabase: SupabaseClient, name: string, sort_order: number): Promise<Result> {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "A category name is required." };
  const { error } = await supabase
    .from("menu_categories")
    .insert({ name: clean.slice(0, 80), sort_order });
  return error ? { ok: false, error: "Couldn't create the category — please retry." } : { ok: true };
}
export async function updateCategory(
  supabase: SupabaseClient,
  id: string,
  name: string,
  sort_order: number,
): Promise<Result> {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "A category name is required." };
  const { error } = await supabase
    .from("menu_categories")
    .update({ name: clean.slice(0, 80), sort_order })
    .eq("id", id);
  return error ? { ok: false, error: "Couldn't save the category — please retry." } : { ok: true };
}
export async function deleteCategory(supabase: SupabaseClient, id: string): Promise<Result> {
  // Block deleting a non-empty category — its dishes would cascade-delete.
  const { count } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Move or delete this category's dishes first." };
  }
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  return error ? { ok: false, error: "Couldn't delete the category — please retry." } : { ok: true };
}
