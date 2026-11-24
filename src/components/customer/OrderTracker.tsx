"use client";

import { Ban, Check, ChefHat, ClipboardCheck, Hourglass, PackageCheck, Phone, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatJOD } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, type OrderStatus } from "@/types";
import { TERMINAL_STATUSES, type OrderDTO } from "./types";

const FLOW: { status: OrderStatus; icon: typeof Check; hint: string }[] = [
  { status: "pending_verification", icon: Hourglass, hint: "The cashier is checking your CliQ transfer" },
  { status: "received", icon: ClipboardCheck, hint: "Your order has reached the team" },
  { status: "preparing", icon: ChefHat, hint: "We're preparing your order now" },
  { status: "ready", icon: PackageCheck, hint: "Your order is ready" },
  { status: "completed", icon: Check, hint: "Enjoy!" },
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
  const where = order.source === "qr" ? `Table ${order.tableNumber}` : "Pickup";
  const pickup = order.pickupTime ? new Date(order.pickupTime) : null;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4">
        <section
          className={`rounded-card px-6 py-10 text-center text-paper transition-colors duration-500 md:py-14 ${ready ? "bg-sage" : dead ? "bg-wine" : "bg-ink"}`}
          aria-live="polite"
        >
          <h1 className="text-lg text-paper/80">Your order number</h1>
          <p className="tabular my-2 text-8xl font-semibold leading-none tracking-tight md:text-9xl">#{order.number}</p>
          <p className="text-xl font-semibold">{ORDER_STATUS_LABEL[order.status]}</p>
          <p className="mt-2 text-paper/75">
            {order.branch.name} · {where}
            {pickup && <> · <span className="tabular">{ammanClock(pickup)}</span></>}
          </p>
        </section>

        {stale && !terminal && <p role="status" className="text-center text-sm text-muted">Can&apos;t refresh right now, retrying...</p>}

        {dead ? (
          <section className="rounded-card bg-card p-6">
            <p className="flex items-center gap-2 text-lg font-semibold text-wine">
              {order.status === "rejected" ? <XCircle className="size-5" /> : <Ban className="size-5" />}
              {order.status === "rejected" ? "We couldn't accept this order" : "This order was cancelled"}
            </p>
            {order.rejectReason && <p className="mt-2 leading-relaxed">Reason: {order.rejectReason}</p>}
            <p className="mt-2 text-muted">If you already transferred the amount, contact the branch and we&apos;ll sort it out.</p>
            {order.branch.phone && (
              <a href={`tel:${order.branch.phone}`} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-ink-2 active:scale-95">
                <Phone className="size-4" /> Contact the branch · <span className="tabular">{order.branch.phone}</span>
              </a>
            )}
          </section>
        ) : (
          <section className="rounded-card bg-card p-4 md:p-6" aria-label="Order progress">
            <ol className="space-y-1">
              {steps.map((s, i) => {
                const done = i < idx || order.status === "completed";
                const now = i === idx && order.status !== "completed";
                const Icon = s.icon;
                return (
                  <li key={s.status} aria-current={now ? "step" : undefined} className={`flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors ${now ? "bg-sand/50" : ""}`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors ${done ? "bg-sage text-paper" : now ? "bg-ink text-paper" : "bg-paper-2 text-muted"}`}>
                      {done ? <Check className="size-5" /> : <Icon className={`size-5 ${now && s.status !== "ready" ? "animate-pulse" : ""}`} />}
                    </span>
                    <span className={done || now ? "" : "text-muted"}>
                      <span className="block font-semibold">{ORDER_STATUS_LABEL[s.status]}</span>
                      {now && <span className="block text-sm text-ink-2">{s.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            {order.status === "pending_verification" && (
              <p className="mt-4 rounded-2xl bg-sky/10 p-4 text-sm leading-relaxed text-sky">
                Preparation starts only after the cashier confirms your CliQ transfer. Keep this page open; it updates by itself.
              </p>
            )}
          </section>
        )}
      </div>

      <section className="rounded-card bg-card p-5 md:p-6">
        <h2 className="mb-2 text-lg font-semibold">Your order</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i, n) => (
            <li key={n} className="flex items-start justify-between gap-3 py-3">
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
        <div className="mt-3 flex items-baseline justify-between rounded-2xl bg-paper-2 px-4 py-3">
          <span className="text-muted">Total · {PAYMENT_LABEL[order.paymentMethod]}</span>
          <span className="tabular text-2xl font-semibold">{formatJOD(order.total)}</span>
        </div>
        <p className="mt-5 text-center">
          <Link href={`/b/${order.branch.slug}`} className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline">
            Back to the menu
          </Link>
        </p>
      </section>
    </div>
  );
}
