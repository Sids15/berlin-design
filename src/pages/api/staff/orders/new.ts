/**
 * POST /api/staff/orders/new — a server builds an order at the table and it
 * lands already confirmed (source: server). The form posts a `qty_<itemId>`
 * field per dish plus an optional table + note; we turn the positive quantities
 * into lines and hand them to createOrder, which re-reads live prices. Only
 * roles that take orders (manager, server) may do this.
 */
import type { APIRoute } from "astro";
import { requireStaff } from "../../../../lib/auth/session";
import { createOrder, type CreateOrderLine } from "../../../../lib/orders/create";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const gate = requireStaff(context.locals, ["manager", "server"]);
  if (gate instanceof Response) return gate;

  const form = await context.request.formData();
  const table_label = String(form.get("table_label") ?? "");
  const notes = String(form.get("notes") ?? "");

  // Collect qty_<itemId> fields with a positive quantity.
  const lines: CreateOrderLine[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("qty_")) continue;
    const qty = Math.floor(Number(value));
    if (Number.isFinite(qty) && qty > 0) {
      lines.push({ item_id: key.slice(4), qty });
    }
  }

  if (lines.length === 0) {
    return context.redirect("/staff/new?err=empty", 303);
  }

  const result = await createOrder(
    { table_label, notes, lines },
    { source: "server", autoConfirm: true, confirmedBy: gate.user.id },
  );

  if (!result.ok) {
    const q = new URLSearchParams({ err: result.error });
    return context.redirect(`/staff/new?${q.toString()}`, 303);
  }

  const q = new URLSearchParams({ code: result.code, ok: "created" });
  return context.redirect(`/staff?${q.toString()}`, 303);
};
