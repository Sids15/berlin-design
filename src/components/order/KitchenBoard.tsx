/**
 * KitchenBoard — the live kitchen queue island. Three lanes (New → Preparing →
 * Ready); each ticket advances one step on tap. Updates come from polling
 * /api/staff/kitchen/active every few seconds (same shape the server rendered),
 * so the board never computes time itself — `waited_min` arrives as data. That
 * keeps SSR and hydration identical.
 */
import { useEffect, useState } from "react";
import "./kitchen-board.css";

interface KitchenLine {
  name: string;
  qty: number;
  notes: string | null;
}
interface KitchenOrderData {
  code: string;
  table_label: string | null;
  status: "confirmed" | "preparing" | "ready";
  waited_min: number;
  notes: string | null;
  items: KitchenLine[];
}

const POLL_MS = 4000;

const LANES = [
  { status: "confirmed", title: "New", action: "Start preparing" },
  { status: "preparing", title: "Preparing", action: "Mark ready" },
  { status: "ready", title: "Ready", action: "Mark served" },
] as const;

export default function KitchenBoard({
  initialOrders,
}: {
  initialOrders: KitchenOrderData[];
}) {
  const [orders, setOrders] = useState<KitchenOrderData[]>(initialOrders);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // Poll the live queue. The server owns the truth; we just re-render it.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/staff/kitchen/active", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { orders?: KitchenOrderData[] };
        if (alive && Array.isArray(data.orders)) setOrders(data.orders);
      } catch {
        /* transient — the next tick retries */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  async function advance(code: string) {
    setBusy((s) => new Set(s).add(code));
    try {
      const res = await fetch(`/api/staff/kitchen/${code}`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; status?: string };
        if (data.ok && data.status) {
          // Optimistically reflect the move; the next poll reconciles.
          setOrders((prev) =>
            prev.flatMap((o) => {
              if (o.code !== code) return [o];
              if (data.status === "served") return [];
              return [{ ...o, status: data.status as KitchenOrderData["status"] }];
            }),
          );
        }
      }
    } catch {
      /* ignore — the poll will reconcile */
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(code);
        return n;
      });
    }
  }

  return (
    <div className="board">
      {orders.length === 0 && (
        <p className="board__empty">
          No active orders. Confirmed orders land here as servers take them.
        </p>
      )}
      <div className="board__lanes">
        {LANES.map((lane) => {
          const cards = orders.filter((o) => o.status === lane.status);
          return (
            <section key={lane.status} className={`lane lane--${lane.status}`}>
              <header className="lane__head">
                <h2 className="lane__title">{lane.title}</h2>
                <span className="lane__count">{cards.length}</span>
              </header>
              <div className="lane__cards">
                {cards.map((o) => (
                  <article key={o.code} className="ticket">
                    <div className="ticket__top">
                      <span className="ticket__code">{o.code}</span>
                      <span className="ticket__meta">
                        {o.table_label ? `Table ${o.table_label}` : "No table"} · {o.waited_min}m
                      </span>
                    </div>
                    <ul className="ticket__items">
                      {o.items.map((it, idx) => (
                        <li key={idx} className="ticket__item">
                          <span className="ticket__qty">{it.qty}×</span>
                          <span className="ticket__name">
                            {it.name}
                            {it.notes && <span className="ticket__inote">{it.notes}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && <p className="ticket__note">Note: {o.notes}</p>}
                    <button
                      type="button"
                      className="ticket__advance"
                      onClick={() => advance(o.code)}
                      disabled={busy.has(o.code)}
                    >
                      {busy.has(o.code) ? "…" : lane.action}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
