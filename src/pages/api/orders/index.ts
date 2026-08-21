/**
 * POST /api/orders — place a customer order.
 *
 * The customer's browser can't touch the `orders` tables (staff-only RLS), so
 * ordering funnels through here. Body: { table_label?, notes?, lines: [...] }.
 * Returns { code } on success — the client then routes to /order/<code>.
 */
import type { APIRoute } from "astro";
import { createOrder, type CreateOrderInput } from "../../../lib/orders/create";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: CreateOrderInput;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const result = await createOrder(body);
  if (!result.ok) return json({ error: result.error }, 422);

  return json({ code: result.code }, 201);
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
