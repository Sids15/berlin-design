/**
 * OrderStatus — the live status region on the tracking page. Owns just the
 * status banner: it polls GET /api/orders/<code> while the order is still
 * "waiting" and flips to "Order placed" the moment a server accepts it. Stops
 * polling once the order is placed or cancelled.
 */
import { useEffect, useState } from "react";
import type { CustomerOrderState } from "../../lib/orders/track";

const POLL_MS = 4000;

const COPY: Record<CustomerOrderState, { title: string; note: string; tone: string }> = {
  waiting: {
    title: "Waiting for a server",
    note: "Show your code below to a server — they'll accept your order at the table.",
    tone: "waiting",
  },
  placed: {
    title: "Order placed",
    note: "A server has accepted your order. It's on the way.",
    tone: "placed",
  },
  cancelled: {
    title: "Order cancelled",
    note: "This order was cancelled. Please speak to a server if that's unexpected.",
    tone: "cancelled",
  },
};

export default function OrderStatus({
  code,
  initialState,
}: {
  code: string;
  initialState: CustomerOrderState;
}) {
  const [state, setState] = useState<CustomerOrderState>(initialState);

  useEffect(() => {
    if (state !== "waiting") return;
    let alive = true;

    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${code}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { state?: CustomerOrderState };
        if (alive && data.state && data.state !== state) setState(data.state);
      } catch {
        /* transient network error — the next tick retries */
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, state]);

  const c = COPY[state];
  return (
    <div className={`status status--${c.tone}`} aria-live="polite">
      <span className="status__pulse" aria-hidden="true" />
      <div>
        <h2 className="status__title">{c.title}</h2>
        <p className="status__note">{c.note}</p>
      </div>
    </div>
  );
}
