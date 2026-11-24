"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, CreditCard, Delete, Loader2, Smartphone } from "lucide-react";
import { toFils } from "@/lib/money";
import { CountUp, gsap, reducedMotion, useGSAP } from "./motion";
import { Modal, press } from "./ui";
import type { PaymentMethod } from "@/types";
import type { PosBranch } from "./types";

const BILLS = [1, 5, 10, 20, 50];
const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "cliq", label: "CliQ", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
];

export default function ChargeSheet({
  total,
  initial,
  branch,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  total: number;
  initial: PaymentMethod;
  branch: PosBranch;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (m: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState(initial);
  const [tendered, setTendered] = useState("");
  const paid = toFils(tendered || 0);
  const change = paid - total;
  const ok = method !== "cash" || paid >= total;
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useGSAP(
    () => {
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      if (!reducedMotion()) gsap.from(panelRef.current, { autoAlpha: 0, y: 6, duration: 0.18, ease: "power2.out" });
    },
    { dependencies: [method] },
  );

  const key = (k: string) =>
    setTendered((t) => {
      if (k === "back") return t.slice(0, -1);
      if (k === ".") return t.includes(".") ? t : (t || "0") + ".";
      if (t.includes(".") ? t.split(".")[1].length >= 3 : t.length >= 5) return t;
      return t === "0" ? k : t + k;
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (method === "cash" && (/^\d$/.test(e.key) || e.key === ".")) key(e.key);
      else if (method === "cash" && e.key === "Backspace") key("back");
      else if (e.key === "Enter" && ok && !busy) onConfirm(method);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [method, ok, busy, onConfirm]);

  return (
    <Modal title="Take payment" onClose={onClose} locked={busy} className="sm:max-w-3xl">
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:gap-5 sm:p-6">
        <div className="flex items-end justify-between">
          <span className="text-muted">Amount due</span>
          <CountUp value={total} from={0} duration={0.45} className="tabular text-3xl font-semibold sm:text-4xl" />
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper-2 p-1">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`flex h-12 items-center justify-center gap-2 rounded-lg font-semibold sm:h-14 ${press} ${method === id ? "border border-line bg-card" : "border border-transparent text-muted hover:text-ink"}`}
            >
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>

        <div ref={panelRef}>
          {method === "cash" ? (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:gap-5">
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-line bg-paper p-4">
                  <span className="text-sm text-muted">Cash received</span>
                  <p className="tabular h-12 text-end text-4xl font-semibold">{tendered || <span className="text-line">0.000</span>}</p>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-paper-2 p-4">
                  <span className="text-muted">Change due</span>
                  <CountUp value={Math.max(change, 0)} duration={0.2} className={`tabular text-2xl font-semibold sm:text-3xl ${change >= 0 && paid > 0 ? "text-sage" : "text-muted"}`} />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {BILLS.map((b) => (
                    <button key={b} onClick={() => setTendered(String(b))} className={`tabular h-14 rounded-xl border border-line bg-card font-semibold ${press} hover:bg-paper-2 active:bg-paper-2`}>
                      {b}
                    </button>
                  ))}
                  <button
                    onClick={() => setTendered((total / 1000).toFixed(3).replace(/\.?0+$/, ""))}
                    className={`col-span-5 h-12 rounded-xl border border-line text-sm font-semibold text-ink ${press} hover:bg-paper-2 active:bg-paper-2`}
                  >
                    Exact amount
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:w-72">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"].map((k) => (
                  <button key={k} onClick={() => key(k)} aria-label={k === "back" ? "Backspace" : undefined} className={`tabular grid h-14 place-items-center rounded-xl border border-line bg-card text-2xl font-medium sm:h-[4.5rem] ${press} hover:bg-paper-2 active:bg-paper-2`}>
                    {k === "back" ? <Delete className="size-6" /> : k}
                  </button>
                ))}
              </div>
            </div>
          ) : method === "cliq" ? (
            <div className="rounded-xl bg-paper-2 p-6 text-center">
              <p className="text-muted">Ask the customer to transfer to</p>
              <p className="mt-2 text-3xl font-semibold tracking-wide">{branch.cliqAlias}</p>
              {branch.cliqName && <p className="mt-1 text-muted">{branch.cliqName}</p>}
              <p className="mt-4 text-sm text-wine">Only confirm once you see the transfer notification on your phone.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-paper-2 p-6 text-center text-muted">Run the card on the terminal, then confirm once it&apos;s approved.</div>
          )}
        </div>

        {error && <p className="text-wine">{error}</p>}
        <button
          disabled={!ok || busy}
          onClick={() => onConfirm(method)}
          className={`flex h-16 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink text-lg font-semibold text-paper disabled:opacity-40 sm:h-[4.5rem] sm:text-xl ${press}`}
        >
          {busy && <Loader2 className="size-5 animate-spin" />}
          {method === "cash" ? "Confirm cash payment" : method === "cliq" ? "CliQ transfer received" : "Card payment approved"}
        </button>
      </div>
    </Modal>
  );
}
