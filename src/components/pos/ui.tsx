"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useOverlay } from "./motion";

/** Instant press feedback on every touch target. */
export const press = "transition-[transform,background-color,opacity] duration-100 active:scale-[0.97]";

/** Wall-clock ms, re-rendered every `ms`. Null until mounted so SSR markup matches. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => (clearTimeout(first), clearInterval(t));
  }, [ms]);
  return now;
}

/** Full-screen on phones, centered dialog (or bottom sheet) from `sm` up. */
export function Modal({
  title,
  onClose,
  children,
  className = "sm:max-w-2xl",
  sheet = false,
  locked = false,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  sheet?: boolean;
  /** Ignore close requests (e.g. while a payment is in flight). */
  locked?: boolean;
}) {
  const { root, panel, close } = useOverlay(onClose, { y: 24 }, locked);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div ref={root} className={`fixed inset-0 z-40 flex justify-center bg-ink/25 sm:p-4 ${sheet ? "items-end" : "items-end sm:items-center"}`} onClick={close}>
      <div
        ref={panel}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-t-card bg-card shadow-lift sm:rounded-card ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line ps-4 pe-2 sm:h-16 sm:ps-6">
            <h2 className="min-w-0 truncate text-base font-semibold sm:text-lg">{title}</h2>
            <button onClick={close} aria-label="Close" className={`grid size-11 place-items-center rounded-full text-muted ${press} active:bg-paper-2 sm:size-12`}>
              <X className="size-6" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-14 w-full rounded-xl border border-line bg-paper px-4 text-lg outline-none transition-colors focus:border-gold focus:bg-card";
