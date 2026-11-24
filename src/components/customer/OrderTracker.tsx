"use client";

import { Check, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatJOD } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, type OrderStatus } from "@/types";
import { gsap, MOTION_OK, useGSAP } from "./motion";
import { TERMINAL_STATUSES, type OrderDTO } from "./types";

const FLOW: { status: OrderStatus; hint: string }[] = [
  { status: "pending_verification", hint: "The cashier is checking your CliQ transfer" },
  { status: "received", hint: "Your order has reached the team" },
  { status: "preparing", hint: "We're preparing your order now" },
  { status: "ready", hint: "Your order is ready" },
  { status: "completed", hint: "Enjoy!" },
];

function alertReady() {
  navigator.vibrate?.([220, 110, 220]);
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.22 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.22);
      o.stop(ctx.currentTime + i * 0.22 + 0.55);
    });
  } catch {}
}

// shortcut: fixed UTC+3 like hours.ts; use Intl timeZone "Asia/Amman" if Jordan reintroduces DST.
const ammanClock = (d: Date) => `${String((d.getUTCHours() + 3) % 24).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

export function OrderTracker({ initial }: { initial: OrderDTO }) {
  const [order, setOrder] = useState(initial);
  const [stale, setStale] = useState(false);
  const last = useRef(initial.status);
  const terminal = TERMINAL_STATUSES.includes(order.status);

  useEffect(() => {
    if (terminal) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${initial.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const next: OrderDTO = await res.json();
        if (stop) return;
        setStale(false);
        if (next.status === "ready" && last.current !== "ready") alertReady();
        last.current = next.status;
        setOrder(next);
      } catch {
        if (!stop) setStale(true);
      }
    };
    const t = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [initial.id, terminal]);

  const cliq = order.paymentMethod === "cliq";
  const steps = FLOW.filter((s) => cliq || s.status !== "pending_verification");
  const idx = steps.findIndex((s) => s.status === order.status);
  const dead = order.status === "rejected" || order.status === "cancelled";
  const ready = order.status === "ready";
  const completed = order.status === "completed";
  const where = order.source === "qr" ? `Table ${order.tableNumber}` : "Pickup";
  const pickup = order.pickupTime ? new Date(order.pickupTime) : null;

  const root = useRef<HTMLDivElement>(null);
  const seen = useRef<{ idx: number; status: OrderStatus } | null>(null);

  // First paint: the number, the steps and the progress line settle in one after another.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-num]", { y: 28, autoAlpha: 0, duration: 0.9 })
          .from("[data-status]", { y: 14, autoAlpha: 0, duration: 0.6 }, 0.25)
          .from("[data-step]", { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.35)
          .from("[data-fill]", { scaleY: 0, duration: 0.6, ease: "power2.inOut", stagger: 0.18 }, 0.6)
          .from("[data-order]", { y: 20, autoAlpha: 0, duration: 0.7 }, 0.3);
      });
    },
    { scope: root },
  );

  // Each status change: the new stretch of line draws, its marker settles, and the current step breathes.
  useGSAP(
    () => {
      const prev = seen.current;
      seen.current = { idx, status: order.status };
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo("[data-pulse]", { scale: 1, opacity: 0.45 }, { scale: 2, opacity: 0, duration: 2.2, repeat: -1, ease: "power1.out" });
        if (!prev || prev.idx === idx) return;
        const fresh = gsap.utils.toArray<HTMLElement>("[data-fill]").filter((el) => Number(el.dataset.i) >= prev.idx);
        gsap.from(fresh, { scaleY: 0, duration: 0.7, ease: "power2.inOut", stagger: 0.2 });
        gsap.from(`[data-marker="${idx}"]`, { scale: 0.6, duration: 0.6, ease: "back.out(2.5)", delay: 0.35 });
        if (order.status === "ready") gsap.fromTo("[data-num]", { scale: 1.06 }, { scale: 1, duration: 1, ease: "elastic.out(1, 0.5)" });
      });
    },
    { scope: root, dependencies: [idx, order.status], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-16">
      <div className="space-y-10">
        <section
          className={`rounded-card border px-6 py-10 transition-colors duration-500 md:px-10 md:py-14 ${ready ? "border-sage" : dead ? "border-wine/40" : "border-line"}`}
          aria-live="polite"
        >
          <h1 className="text-muted">Your order number</h1>
          <p data-num className="tabular my-3 font-display text-8xl font-medium leading-none tracking-[-0.04em] md:text-9xl">#{order.number}</p>
          <p data-status className={`font-display text-2xl font-medium tracking-tight ${ready ? "text-sage" : dead ? "text-wine" : ""}`}>{ORDER_STATUS_LABEL[order.status]}</p>
          <p className="mt-2 text-ink-2">
            {order.branch.name} · {where}
            {pickup && <> · <span className="tabular">{ammanClock(pickup)}</span></>}
          </p>
        </section>

        {stale && !terminal && <p role="status" className="text-sm text-muted">Can&apos;t refresh right now, retrying...</p>}

        {dead ? (
          <section>
            <p className="font-display text-2xl font-medium tracking-tight text-wine">
              {order.status === "rejected" ? "We couldn't accept this order" : "This order was cancelled"}
            </p>
            {order.rejectReason && <p className="mt-3 leading-relaxed">Reason: {order.rejectReason}</p>}
            <p className="mt-2 text-muted">If you already transferred the amount, contact the branch and we&apos;ll sort it out.</p>
            {order.branch.phone && (
              <a href={`tel:${order.branch.phone}`} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper transition-[background-color,transform] hover:bg-ink-2 active:scale-95">
                <Phone className="size-4" /> Contact the branch · <span className="tabular">{order.branch.phone}</span>
              </a>
            )}
          </section>
        ) : (
          <section aria-label="Order progress">
            <ol>
              {steps.map((s, i) => {
                const done = i < idx || completed;
                const now = i === idx && !completed;
                return (
                  <li key={s.status} data-step aria-current={now ? "step" : undefined} className="relative flex gap-4 pb-9 last:pb-0">
                    {i < steps.length - 1 && (
                      <span aria-hidden className="absolute start-[13.5px] top-8 bottom-1 w-px bg-line">
                        {(i < idx || completed) && <span data-fill data-i={i} className="absolute inset-0 origin-top bg-ink" />}
                      </span>
                    )}
                    <span
                      data-marker={i}
                      className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-500 ${done ? "border-ink bg-ink text-paper" : now ? "border-ink bg-card" : "border-line bg-card"}`}
                    >
                      {done ? <Check className="size-4" strokeWidth={2.5} /> : now ? <span className="size-2.5 rounded-full bg-ink" /> : null}
                      {now && <span data-pulse aria-hidden className="absolute -inset-px rounded-full border border-ink opacity-0" />}
                    </span>
                    <span className="pt-0.5">
                      <span className={`block font-semibold ${done || now ? "" : "text-muted"}`}>{ORDER_STATUS_LABEL[s.status]}</span>
                      {now && <span className="mt-0.5 block text-sm text-ink-2">{s.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            {order.status === "pending_verification" && (
              <p className="mt-8 border-t border-line pt-5 text-sm leading-relaxed text-muted">
                Preparation starts only after the cashier confirms your CliQ transfer. Keep this page open; it updates by itself.
              </p>
            )}
          </section>
        )}
      </div>

      <section data-order className="rounded-card border border-line bg-card p-6 md:p-8">
        <h2 className="font-display text-2xl font-medium tracking-tight">Your order</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((i, n) => (
            <li key={n} className="flex items-start justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="tabular">{i.quantity}×</span> {i.name}
                </p>
                {(i.variantName || i.modifiers.length > 0) && <p className="text-sm text-muted">{[i.variantName, ...i.modifiers].filter(Boolean).join(" · ")}</p>}
                {i.notes && <p className="text-sm text-muted">&ldquo;{i.notes}&rdquo;</p>}
              </div>
              <span className="tabular shrink-0 font-medium">{formatJOD(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-muted">Total · {PAYMENT_LABEL[order.paymentMethod]}</span>
          <span className="tabular font-display text-3xl font-medium tracking-tight">{formatJOD(order.total)}</span>
        </div>
        <p className="mt-6">
          <Link href={`/b/${order.branch.slug}`} className="inline-flex min-h-11 items-center text-muted underline underline-offset-4 transition-colors hover:text-ink">
            Back to the menu
          </Link>
        </p>
      </section>
    </div>
  );
}
