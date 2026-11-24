"use client";

import { useRef, useState } from "react";
import { Banknote, CreditCard, Minus, NotebookPen, Plus, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { CountUp, gsap, reducedMotion, useGSAP } from "./motion";
import { press } from "./ui";
import { lineTotal, type CartLine } from "./types";
import type { PaymentMethod } from "@/types";

const field = "h-12 w-full rounded-xl border border-line bg-paper px-3 outline-none transition-colors focus:border-gold focus:bg-card";

export default function Ticket({
  lines,
  total,
  table,
  note,
  canRepeat,
  disabled,
  lastAddedKey,
  onTable,
  onNote,
  onQty,
  onRemove,
  onLineNote,
  onClear,
  onRepeat,
  onCharge,
}: {
  lines: CartLine[];
  total: number;
  table: string;
  note: string;
  canRepeat: boolean;
  disabled: boolean;
  lastAddedKey: string;
  onTable: (v: string) => void;
  onNote: (v: string) => void;
  onQty: (key: string, d: number) => void;
  onRemove: (key: string) => void;
  onLineNote: (key: string, v: string) => void;
  onClear: () => void;
  onRepeat: () => void;
  onCharge: (m: PaymentMethod) => void;
}) {
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const body = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const leaving = useRef(new Set<string>());
  const keys = lines.map((l) => l.key).join();

  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>("[data-key]", body.current);
      const prev = seen.current;
      seen.current = new Set(rows.map((r) => r.dataset.key!));
      if (!prev || reducedMotion()) return;
      const fresh = rows.filter((r) => !prev.has(r.dataset.key!));
      if (fresh.length) gsap.from(fresh, { x: 16, autoAlpha: 0, duration: 0.2, ease: "power2.out", stagger: 0.04, clearProps: "all" });
      // re-adding an existing line has no new row, so nudge it
      const bumped = rows.find((r) => r.dataset.key === lastAddedKey.split("#")[0]);
      if (bumped && !fresh.includes(bumped)) gsap.fromTo(bumped, { scale: 0.97 }, { scale: 1, duration: 0.2, ease: "power2.out", clearProps: "transform" });
    },
    { dependencies: [keys, lastAddedKey], scope: body },
  );

  /** Slide a line out, then run the state change. Falls through at once without motion. */
  const leave = (key: string, done: () => void) => {
    const row = body.current?.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!row || reducedMotion()) return done();
    if (leaving.current.has(key)) return;
    leaving.current.add(key);
    gsap.to(row, {
      x: 24,
      autoAlpha: 0,
      duration: 0.15,
      ease: "power1.in",
      onComplete: () => {
        leaving.current.delete(key);
        done();
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="font-semibold">
          Current ticket {count > 0 && <span className="tabular ms-1 font-normal text-muted">· {count}</span>}
        </h2>
        {lines.length > 0 ? (
          <button onClick={onClear} className={`flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-wine ${press} hover:bg-wine/10 active:bg-wine/10`}>
            <Trash2 className="size-4" /> Clear
          </button>
        ) : (
          canRepeat && (
            <button onClick={onRepeat} className={`flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-gold-2 ${press} hover:bg-paper-2 active:bg-paper-2`}>
              <RotateCcw className="size-4" /> Repeat last
            </button>
          )
        )}
      </div>

      <div ref={body} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="grid h-full min-h-40 place-items-center p-8 text-center text-muted">
            <p>Pick items from the menu<br />to start a new ticket</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} data-key={l.key} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">
                      {l.item.name}
                      {l.variant && l.item.variants.length > 1 && <span className="ms-2 text-sm font-normal text-muted">{l.variant.name}</span>}
                    </p>
                    {l.modifiers.length > 0 && <p className="text-sm text-muted">{l.modifiers.map((m) => m.name).join(", ")}</p>}
                    {l.notes && noteOpen !== l.key && <p className="text-sm text-gold-2">Note: {l.notes}</p>}
                  </div>
                  <span className="tabular shrink-0 font-semibold">{formatJOD(lineTotal(l))}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-xl border border-line bg-paper">
                    <button onClick={() => (l.quantity === 1 ? leave(l.key, () => onQty(l.key, -1)) : onQty(l.key, -1))} aria-label="Decrease quantity" className={`grid size-11 place-items-center rounded-xl ${press} hover:bg-paper-2 active:bg-paper-2`}>
                      {l.quantity === 1 ? <Trash2 className="size-5 text-wine" /> : <Minus className="size-5" />}
                    </button>
                    <span className="tabular w-8 text-center text-lg font-semibold">{l.quantity}</span>
                    <button onClick={() => onQty(l.key, 1)} aria-label="Increase quantity" className={`grid size-11 place-items-center rounded-xl ${press} hover:bg-paper-2 active:bg-paper-2`}>
                      <Plus className="size-5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setNoteOpen(noteOpen === l.key ? null : l.key)}
                      aria-label="Line note"
                      className={`grid size-11 place-items-center rounded-xl ${press} ${l.notes ? "text-gold-2" : "text-muted"} hover:bg-paper-2 active:bg-paper-2`}
                    >
                      <NotebookPen className="size-5" />
                    </button>
                    <button onClick={() => leave(l.key, () => onRemove(l.key))} aria-label="Remove item" className={`grid size-11 place-items-center rounded-xl text-muted ${press} hover:bg-wine/10 hover:text-wine active:bg-wine/10 active:text-wine`}>
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
                {noteOpen === l.key && (
                  <input
                    autoFocus
                    className={`${field} mt-2`}
                    placeholder="e.g. no sugar"
                    maxLength={200}
                    value={l.notes}
                    onChange={(e) => onLineNote(l.key, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setNoteOpen(null)}
                    onBlur={() => setNoteOpen(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-line bg-paper-2 p-4">
        <div className="flex gap-2">
          <input
            className={`${field} tabular w-24 shrink-0 text-center`}
            inputMode="numeric"
            placeholder="Table"
            aria-label="Table number"
            value={table}
            onChange={(e) => onTable(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
          <input className={field} placeholder="Order note" maxLength={300} value={note} onChange={(e) => onNote(e.target.value)} />
        </div>
        <div className="flex items-end justify-between px-1 pt-1">
          <span className="text-muted">Total</span>
          <CountUp value={total} className="tabular text-3xl font-semibold" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Pay disabled={disabled} onClick={() => onCharge("cash")} icon={<Banknote className="size-6" />} label="Cash" hint="F2" primary />
          <Pay disabled={disabled} onClick={() => onCharge("cliq")} icon={<Smartphone className="size-6" />} label="CliQ" hint="F3" />
          <Pay disabled={disabled} onClick={() => onCharge("card")} icon={<CreditCard className="size-6" />} label="Card" hint="F4" />
        </div>
      </div>
    </div>
  );
}

function Pay({ icon, label, hint, primary, disabled, onClick }: { icon: React.ReactNode; label: string; hint: string; primary?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative flex h-20 flex-col items-center justify-center gap-1 rounded-xl font-semibold disabled:opacity-35 ${press} ${
        primary ? "bg-ink text-paper" : "border border-line bg-card hover:border-sand active:bg-paper-2"
      }`}
    >
      {icon}
      {label}
      <kbd className="absolute end-2 top-1.5 hidden text-xs font-normal opacity-60 xl:block">{hint}</kbd>
    </button>
  );
}
