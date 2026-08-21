/**
 * POST /api/staff/kitchen/<code> — mark a ticket complete (served). Any
 * signed-in staff may complete. Returns JSON for the board island (fetch).
 */
import type { APIRoute } from "astro";
import { requireStaff } from "../../../../lib/auth/session";
import { completeOrder } from "../../../../lib/orders/kitchen";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const gate = requireStaff(context.locals);
  if (gate instanceof Response) return gate;

  const code = (context.params.code ?? "").toUpperCase();
  const result = await completeOrder(context.locals.supabase, code);

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 422,
    headers: { "content-type": "application/json" },
  });
};
