/**
 * GET /api/orders/<code> — the customer tracking poll. Returns just the
 * collapsed customer state so the tracking page can flip "Waiting" → "Order
 * placed" without exposing staff-only detail. The code is the capability token;
 * an unknown code is a 404.
 */
import type { APIRoute } from "astro";
import { getOrderState } from "../../../lib/orders/track";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const code = (params.code ?? "").toUpperCase();
  if (!code) return json({ error: "No order code." }, 400);

  const state = await getOrderState(code);
  if (!state) return json({ error: "Order not found." }, 404);

  return new Response(JSON.stringify({ state }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
