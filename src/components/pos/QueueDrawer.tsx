"use client";

import { useRef, useState } from "react";
import { Banknote, CreditCard, Printer, RefreshCw, ShieldCheck, X } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/types";
import { api, hhmm } from "./api";
import { OcrBadge } from "./OcrCheck";
import { gsap, reducedMotion, useGSAP, useOverlay } from "./motion";
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

  const { root, panel, close } = useOverlay<HTMLElement>(onClose, { x: -32 });
  const list = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const ids = sorted.map((o) => o.id).join();

  // first paint: cards settle in; afterwards only orders that just arrived slide in and flash
  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-order]", list.current);
      const first = seen.current === null;
      const fresh = cards.filter((c) => !seen.current?.has(c.dataset.order!));
      seen.current = new Set(cards.map((c) => c.dataset.order!));
      if (!fresh.length || reducedMotion()) return;
      if (first) {
        gsap.from(fresh, { y: 12, autoAlpha: 0, duration: 0.22, ease: "power2.out", stagger: 0.04, delay: 0.08, clearProps: "all" });
        return;
      }
      const flash = getComputedStyle(fresh[0]).getPropertyValue("--pos-flash").trim();
      fresh.forEach((c) => {
        const rest = getComputedStyle(c).backgroundColor;
        gsap
          .timeline({ defaults: { ease: "power2.out" }, onComplete: () => gsap.set(c, { clearProps: "all" }) })
          .from(c, { y: -16, autoAlpha: 0, duration: 0.22 })
          .fromTo(c, { backgroundColor: flash }, { backgroundColor: rest, duration: 0.9 }, 0);
      });
    },
    { dependencies: [ids], scope: list },
  );

  return (
    <div ref={root} className="no-print fixed inset-0 z-30 bg-ink/25" onClick={close}>
      <aside ref={panel} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 start-0 flex w-full max-w-[34rem] flex-col border-e border-line bg-paper shadow-lift">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line ps-6 pe-3">
          <h2 className="text-lg font-semibold">
            Incoming orders <span className="tabular ms-1 font-normal text-muted">· {orders.length}</span>
          </h2>
          <div className="flex items-center">
            <button onClick={onChanged} aria-label="Refresh orders" className={`grid size-12 place-items-center rounded-full text-muted ${press} active:bg-paper-2`}>
              <RefreshCw className="size-5" />
            </button>
            <button onClick={close} aria-label="Close" className={`grid size-12 place-items-center rounded-full text-muted ${press} active:bg-paper-2`}>
              <X className="size-6" />
            </button>
          </div>
        </div>

        <div ref={list} className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {sorted.length === 0 && <p className="mt-24 text-center text-muted">No active orders right now</p>}
          {sorted.map((o) => {
            const secs = Math.max(0, Math.floor((now - +new Date(o.createdAt)) / 1000));
            const mins = secs / 60;
            const timerDot = mins < 8 ? "bg-sage" : mins <= 15 ? "bg-gold" : "bg-wine";
            const pending = o.status === "pending_verification";
            const unpaid = o.paymentStatus === "unpaid";
            const next = o.status in NEXT ? NEXT[o.status as keyof typeof NEXT] : null;
            const source =
              o.source === "qr" ? `QR · Table ${o.tableNumber}` : o.source === "pickup" ? `Pickup ${o.pickupTime ? hhmm(o.pickupTime) : ""}` : `POS${o.tableNumber ? ` · Table ${o.tableNumber}` : ""}`;
            const isBusy = busy === o.id;

            return (
              <article key={o.id} data-order={o.id} className={`rounded-xl border bg-card p-4 ${pending ? "border-gold" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-2xl font-semibold">#{o.number}</span>
                    <span className={`text-sm ${o.source === "pos" ? "text-muted" : "font-medium text-sky"}`}>{source}</span>
                  </div>
                  <span className="tabular flex items-center gap-2 text-sm font-semibold">
                    <span className={`size-2 rounded-full ${timerDot}`} aria-hidden />
                    {Math.floor(mins)}:{String(secs % 60).padStart(2, "0")}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">
                  {ORDER_STATUS_LABEL[o.status]} · {PAYMENT_LABEL[o.paymentMethod]} · <span className="tabular">{formatJOD(o.total)}</span>
                  {o.customerName && ` · ${o.customerName}`}
                </p>
                {pending && o.receiptUrl && (
                  <div className="mt-2" title={o.receiptVerification?.reasons.join("\n")}>
                    <OcrBadge v={o.receiptVerification} />
                  </div>
                )}

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
                {o.notes && <p className="mt-2 rounded-lg bg-paper-2 px-3 py-2 text-sm text-ink-2">{o.notes}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {pending && (
                    <button onClick={() => onVerify(o)} className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-paper ${press}`}>
                      <ShieldCheck className="size-5" /> Verify payment
                    </button>
                  )}
                  {unpaid && !pending && (
                    <>
                      <span className="flex h-14 items-center gap-2 px-1 font-semibold text-wine">
                        <span className="size-2 rounded-full bg-wine" aria-hidden />
                        Unpaid
                      </span>
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
                      className={`h-14 flex-1 rounded-xl font-semibold disabled:opacity-35 ${press} ${next[0] === "completed" ? "border border-ink" : "bg-ink text-paper"}`}
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
