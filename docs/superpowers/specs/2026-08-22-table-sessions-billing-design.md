# Table sessions, collective billing, printing & staff notifications — design

Date: 2026-08-22 · Extends `docs/architecture.md` (Feature 5+).

## Problem

Orders are currently standalone. A table that orders more than once produces
unrelated orders, so there is no collective bill. There is also no way to set a
customer's table without trusting typed input, no printing (kitchen slip or
bill), no proactive signal to servers that an order is waiting, and the kitchen
carries a multi-step advance flow it doesn't need.

## Decisions

- **Table number** is set by **per-table QR codes** (`/menu?table=<label>`).
- **Tab lifecycle**: a tab **auto-opens** on a table's first order; later rounds
  join the same open tab; a server **closes** it at payment.
- **Bill total** = item subtotal + **GST 5%** + **service charge 10%** (named
  constants in `src/lib/billing.ts`). The bill includes all **non-cancelled**
  rounds in the tab.
- **Kitchen** shows active orders and **completes** them in one tap.
- **Notification** to servers = a live, polled **pending-confirmation queue** on
  `/staff` (table + code + items), inline confirm/cancel, plus a tab-title count.

## Data model (`supabase/migrations/003_tabs.sql`)

```
tab_status enum: 'open' | 'closed'

tabs:
  id, table_label (not null), status (default 'open'),
  opened_at, closed_at, closed_by → profiles

  partial unique index (table_label) where status='open'  -- one open tab/table

orders: + tab_id → tabs (nullable, on delete set null)
```

RLS: `tabs` is staff-only (mirrors `orders`). Customers never read `tabs`
directly — the service-role path attaches orders, and staff pages use the
authenticated client.

## Order flow

`createOrder` resolves a tab for the order's `table_label` before insert:
find the open tab, or create one; on the unique-index race (two rounds opening
at once) re-read the winner. Orders **with no** `table_label` get `tab_id = null`
(standalone; no collective bill). The customer's "Order something more" link
carries `?table=` so add-more rejoins the same open tab.

## Surfaces

- **`/staff` pending queue** — polls `GET /api/staff/orders/pending`; manager +
  server see waiting orders with table/code/items and confirm/cancel inline.
- **Kitchen** — `getActiveKitchenOrders` + `completeOrder` (confirmed → served);
  board is one list with a single Complete action (lanes removed).
- **Order slip** — `/staff/orders/[code]/slip`, print-optimized (per round).
- **Tabs & bill** — `/staff/tabs` lists open tabs; `/staff/tabs/[id]` is the
  collective bill (merged items, subtotal, GST, service, total) with Close/Mark-
  paid and Print. `src/lib/billing.ts` holds the rates and the total math.
- **Table QR** — `/staff/tables`: enter labels → printable grid of QR cards
  encoding `<origin>/menu?table=<label>` (server-rendered SVG via `qrcode`).

Printing uses `window.print()` with `@media print` hiding chrome.

## Build order (scoped commits)

1. Migration + `tabs` lib + `createOrder` attachment + add-more link.
2. Staff pending-confirmation queue (the notification).
3. Kitchen → complete-only.
4. Printing: order slip, tabs list, collective bill, close tab.
5. Table QR provisioning page.

Out of scope here: the 86/sold-out toggle (Feature 5b) — revisited after, and
likely placed on the manager/admin side since the kitchen is now complete-only.
