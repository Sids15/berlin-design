/**
 * POST /api/staff/kitchen/<code> — advance one ticket a single step along the
 * kitchen path (confirmed → preparing → ready → served). Any signed-in staff
 * may advance. Returns JSON for the board island (which calls it via fetch).
 */
import type { APIRoute } from "astro";
import { requireStaff } from "../../../../lib/auth/session";
import { advanceOrder } from "../../../../lib/orders/kitchen";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const gate = requireStaff(context.locals);
  if (gate instanceof Response) return gate;

  const code = (context.params.code ?? "").toUpperCase();
  const result = await advanceOrder(context.locals.supabase, code);

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 422,
    headers: { "content-type": "application/json" },
  });
};
