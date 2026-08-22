/**
 * GET /api/menu/availability — ids of currently-available dishes. Public (anon,
 * RLS-guarded). The customer menu island polls this so a dish 86'd in the
 * kitchen disappears from the menu live, without a reload.
 */
import type { APIRoute } from "astro";
import { getAvailableItemIds } from "../../../lib/menu/queries";

export const prerender = false;

export const GET: APIRoute = async () => {
  const ids = await getAvailableItemIds();
  return new Response(JSON.stringify({ ids }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
