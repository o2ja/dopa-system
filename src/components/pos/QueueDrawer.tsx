"use client";

import { useState } from "react";
import { Banknote, CreditCard, Printer, ShieldCheck, X } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/types";
import { api, hhmm } from "./api";
import { press, useNow } from "./ui";
import type { QueueOrder } from "./types";

const NEXT = { received: ["preparing", "Start preparing"], preparing: ["ready", "Mark ready"], ready: ["completed", "Hand over"] } as const;

export default function QueueDrawer({
  orders,
  onClose,
  onVerify,
  onChanged,
  onError,
  onOk,
}: {
  orders: QueueOrder[];
  onClose: () => void;
  onVerify: (o: QueueOrder) => void;
  onChanged: () => void;
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const now = useNow() ?? 0;

  const run = async (id: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(id);
    try {
      await fn();
      if (ok) onOk(ok);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    }
    setBusy(null);
  };

  const sorted = [...orders].sort(
    (a, b) => Number(b.status === "pending_verification") - Number(a.status === "pending_verification") || +new Date(a.createdAt) - +new Date(b.createdAt),
  );

  return (
    <div className="no-print fixed inset-0 z-30 pos-fade bg-ink/40" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="pos-drawer absolute inset-y-0 start-0 flex w-full max-w-[34rem] flex-col bg-paper shadow-lift">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line ps-6 pe-3">
          <h2 className="text-lg font-semibold">
            Incoming orders <span className="tabular ms-2 rounded-full bg-ink px-2.5 py-0.5 text-sm text-paper">{orders.length}</span>
          </h2>
          <button onClick={onClose} aria-label="Close" className={`grid size-12 place-items-center rounded-full text-muted ${press} active:bg-paper-2`}>
            <X className="size-6" />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {sorted.length === 0 && <p className="mt-24 text-center text-muted">No active orders right now</p>}
          {sorted.map((o) => {
            const secs = Math.max(0, Math.floor((now - +new Date(o.createdAt)) / 1000));
            const mins = secs / 60;
            const timer = mins < 8 ? "bg-sage/12 text-sage" : mins <= 15 ? "bg-gold/15 text-gold-2" : "bg-wine/12 text-wine";
            const pending = o.status === "pending_verification";
            const unpaid = o.paymentStatus === "unpaid";
            const next = o.status in NEXT ? NEXT[o.status as keyof typeof NEXT] : null;
            const source =
              o.source === "qr" ? `QR · Table ${o.tableNumber}` : o.source === "pickup" ? `Pickup ${o.pickupTime ? hhmm(o.pickupTime) : ""}` : `POS${o.tableNumber ? ` · Table ${o.tableNumber}` : ""}`;
            const isBusy = busy === o.id;

            return (
              <article key={o.id} className={`rounded-2xl border bg-card p-4 shadow-soft ${pending ? "border-gold" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-2xl font-semibold">#{o.number}</span>
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${o.source === "pos" ? "bg-paper-2 text-ink-2" : "bg-sky/12 text-sky"}`}>{source}</span>
                  </div>
                  <span className={`tabular rounded-full px-3 py-1 text-sm font-semibold ${timer}`}>
                    {Math.floor(mins)}:{String(secs % 60).padStart(2, "0")}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">
                  {ORDER_STATUS_LABEL[o.status]} · {PAYMENT_LABEL[o.paymentMethod]} · <span className="tabular">{formatJOD(o.total)}</span>
                  {o.customerName && ` · ${o.customerName}`}
                </p>

                <ul className="mt-3 space-y-1">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <span className="tabular font-semibold">{i.quantity}×</span> {i.name}
                      {i.variantName && <span className="text-muted"> · {i.variantName}</span>}
                      {i.modifiers.length > 0 && <span className="text-sm text-muted"> ({i.modifiers.join(", ")})</span>}
                      {i.notes && <span className="block text-sm text-gold-2">↳ {i.notes}</span>}
                    </li>
                  ))}
                </ul>
                {o.notes && <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-2">{o.notes}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {pending && (
                    <button onClick={() => onVerify(o)} className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-gold font-semibold text-paper ${press}`}>
                      <ShieldCheck className="size-5" /> Verify payment
                    </button>
                  )}
                  {unpaid && !pending && (
                    <>
                      <span className="flex h-14 items-center rounded-xl bg-wine/10 px-4 font-semibold text-wine">Unpaid</span>
                      <button disabled={isBusy} onClick={() => run(o.id, () => api(`/api/pos/orders/${o.id}`, { markPaid: "cash" }, "PATCH"), `#${o.number} collected in cash`)} className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-paper disabled:opacity-40 ${press}`}>
                        <Banknote className="size-5" /> Collect cash
                      </button>
                      <button disabled={isBusy} onClick={() => run(o.id, () => api(`/api/pos/orders/${o.id}`, { markPaid: "card" }, "PATCH"), `#${o.number} collected by card`)} className={`flex h-14 items-center justify-center gap-2 rounded-xl border border-line px-4 font-semibold disabled:opacity-40 ${press}`}>
                        <CreditCard className="size-5" /> Card
                      </button>
                    </>
                  )}
                  {next && (
                    <button
                      disabled={isBusy || (next[0] === "completed" && unpaid)}
                      onClick={() => run(o.id, () => api(`/api/pos/orders/${o.id}`, { status: next[0] }, "PATCH"))}
                      className={`h-14 flex-1 rounded-xl font-semibold disabled:opacity-35 ${press} ${next[0] === "ready" ? "bg-sage text-paper" : next[0] === "completed" ? "border border-ink" : "bg-ink text-paper"}`}
                    >
                      {next[1]}
                    </button>
                  )}
                  {!pending && (
                    <button disabled={isBusy} aria-label="Reprint" onClick={() => run(o.id, () => api(`/api/pos/orders/${o.id}/reprint`, {}), `#${o.number} sent to reprint`)} className={`grid size-14 place-items-center rounded-xl border border-line text-muted disabled:opacity-40 ${press} active:bg-paper-2`}>
                      <Printer className="size-5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
