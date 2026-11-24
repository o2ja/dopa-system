"use client";

import type { ReactNode } from "react";

// min-h-11 = 44px touch target on every control
export const inputCls =
  "min-h-11 w-full rounded-lg border border-line bg-card px-3 py-2 text-base text-ink placeholder:text-muted/70 transition-colors hover:border-sand focus:border-gold focus:outline-none focus-visible:outline-none disabled:opacity-50 sm:text-[0.9375rem]";

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const btnKinds = {
  primary: "bg-ink text-paper hover:bg-ink-2",
  quiet: "border border-line bg-card text-ink hover:border-sand hover:bg-paper-2",
  danger: "border border-line bg-card text-wine hover:border-wine/40 hover:bg-wine/5",
  ghost: "text-muted hover:bg-paper-2 hover:text-ink",
} as const;

export function btn(kind: keyof typeof btnKinds = "quiet", extra = "") {
  return `${btnBase} ${btnKinds[kind]} ${extra}`;
}

/** Square icon-only button, 44px */
export const iconBtn = "inline-grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-50";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, bare }: { checked: boolean; onChange: (v: boolean) => void; label: string; bare?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={bare ? label : undefined}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2.5 text-sm text-ink-2"
    >
      <span className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-200 ${checked ? "border-sage bg-sage" : "border-line bg-paper-2"}`}>
        <span
          className={`absolute top-0.5 size-[1.125rem] rounded-full bg-card shadow-soft transition-[inset-inline-start] duration-200 ease-out ${checked ? "start-[1.125rem]" : "start-0.5"}`}
        />
      </span>
      {!bare && label}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-card p-0.5 text-sm">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`min-h-10 rounded-md px-4 transition-colors ${value === v ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Notice({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`text-sm ${tone === "error" ? "text-wine" : "text-sage"}`}>
      {children}
    </p>
  );
}
