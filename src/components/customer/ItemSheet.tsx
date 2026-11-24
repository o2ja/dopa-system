"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { formatJOD } from "@/lib/money";
import type { CartLine } from "@/store/cart";
import { Sheet } from "./Sheet";
import { defaultVariant, type ItemDTO } from "./types";

const step = "grid size-12 place-items-center rounded-full transition-[background-color,transform] hover:bg-paper-2 active:scale-90";

export function ItemSheet({
  item,
  canOrder,
  onAdd,
  onClose,
}: {
  item: ItemDTO;
  canOrder: boolean;
  onAdd: (line: Omit<CartLine, "key">) => void;
  onClose: () => void;
}) {
  const [variantId, setVariantId] = useState(defaultVariant(item)?.id ?? null);
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    // A required single-choice group starts on its first option so the common case is one tap.
    Object.fromEntries(item.groups.filter((g) => g.minSelect >= 1 && g.maxSelect === 1 && g.modifiers.length).map((g) => [g.id, [g.modifiers[0].id]])),
  );
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const variant = item.variants.find((v) => v.id === variantId);
  const { unit, valid, mods } = useMemo(() => {
    const ids = Object.values(picked).flat();
    const chosen = item.groups.flatMap((g) => g.modifiers).filter((m) => ids.includes(m.id));
    return {
      mods: chosen,
      unit: (variant?.price ?? item.basePrice) + chosen.reduce((s, m) => s + m.price, 0),
      valid: item.groups.every((g) => {
        const n = (picked[g.id] ?? []).length;
        return n >= g.minSelect && n <= g.maxSelect;
      }),
    };
  }, [item, picked, variant]);

  const meal = item.variants.find((v) => v.name === "Meal");
  const showUpsell = meal && variant?.name === "Regular";

  const toggle = (gid: string, mid: string, max: number) =>
    setPicked((p) => {
      const cur = p[gid] ?? [];
      if (cur.includes(mid)) return { ...p, [gid]: cur.filter((x) => x !== mid) };
      if (max === 1) return { ...p, [gid]: [mid] };
      return cur.length >= max ? p : { ...p, [gid]: [...cur, mid] };
    });

  const missing = item.groups.find((g) => (picked[g.id] ?? []).length < g.minSelect);
  const disabled = !canOrder || !item.available || !valid;

  const arrows = (e: KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = item.variants.findIndex((v) => v.id === variantId);
    const next = item.variants[(i + dir + item.variants.length) % item.variants.length];
    setVariantId(next.id);
    (e.currentTarget.querySelector(`[data-variant="${next.id}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <Sheet
      title={item.name}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-line" role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className={step}>
              <Minus className="size-4" />
            </button>
            <span className="tabular w-7 text-center font-semibold" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} className={step}>
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onAdd({
                menuItemId: item.id,
                variantId: variant?.id ?? null,
                modifierIds: mods.map((m) => m.id),
                quantity: qty,
                notes: notes.trim(),
                name: item.name,
                variantName: variant?.name ?? null,
                modNames: mods.map((m) => m.name),
                unitPrice: unit,
              });
              onClose();
            }}
            className="flex h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-ink px-6 text-base font-semibold text-paper transition-[background-color,transform] active:scale-[0.98] enabled:hover:bg-ink-2 disabled:bg-line disabled:text-muted"
          >
            <span className="truncate">
              {!item.available ? "Sold out today" : !canOrder ? "Branch closed" : missing ? `Choose ${missing.name}` : "Add to cart"}
            </span>
            <span className="tabular shrink-0">{formatJOD(unit * qty)}</span>
          </button>
        </div>
      }
    >
      {item.description && (
        <p data-sheet-in className="leading-relaxed text-ink-2">
          {item.description}
        </p>
      )}

      {item.variants.length > 1 && (
        <fieldset data-sheet-in className="mt-7">
          <legend className="mb-3 font-semibold">Size</legend>
          <div role="radiogroup" aria-label="Size" onKeyDown={arrows} className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2">
            {item.variants.map((v) => {
              const on = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-variant={v.id}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setVariantId(v.id)}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-3 py-2 transition-[background-color,border-color,transform] active:scale-[0.97] ${
                    on ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/40"
                  }`}
                >
                  <span className="font-medium">{v.name}</span>
                  <span className={`tabular text-sm ${on ? "text-paper/75" : "text-muted"}`}>{formatJOD(v.price)}</span>
                </button>
              );
            })}
          </div>
          {showUpsell && (
            <button
              type="button"
              onClick={() => setVariantId(meal.id)}
              className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-2 text-start transition-[border-color,transform] hover:border-ink/40 active:scale-[0.99]"
            >
              <span className="font-medium">Make it a meal</span>
              <span className="tabular text-sm font-semibold text-gold-2">+{formatJOD(meal.price - (variant?.price ?? 0))}</span>
            </button>
          )}
        </fieldset>
      )}

      {item.groups.map((g) => {
        const count = (picked[g.id] ?? []).length;
        const unmet = count < g.minSelect;
        return (
          <fieldset key={g.id} data-sheet-in className="mt-7">
            <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
              <span className="font-semibold">{g.name}</span>
              <span className={`text-sm ${g.minSelect >= 1 ? (unmet ? "font-medium text-wine" : "font-medium text-ink-2") : "text-muted"}`}>
                {g.minSelect >= 1 ? "Required" : "Optional"}
                <span className="font-normal text-muted"> · {g.maxSelect === 1 ? "choose 1" : `up to ${g.maxSelect}`}</span>
              </span>
            </legend>
            <div role={g.maxSelect === 1 ? "radiogroup" : "group"} aria-label={g.name} className="space-y-2">
              {g.modifiers.map((m) => {
                const on = (picked[g.id] ?? []).includes(m.id);
                const full = !on && g.maxSelect > 1 && count >= g.maxSelect;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role={g.maxSelect === 1 ? "radio" : "checkbox"}
                    aria-checked={on}
                    disabled={full}
                    onClick={() => toggle(g.id, m.id, g.maxSelect)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2 text-start transition-[border-color,transform] active:scale-[0.99] disabled:opacity-40 ${
                      on ? "border-ink ring-1 ring-ink" : "border-line hover:border-sand"
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center border transition-colors ${g.maxSelect === 1 ? "rounded-full" : "rounded-md"} ${on ? "border-ink bg-ink" : "border-sand"}`}
                    >
                      {on && <Check className="size-3 text-paper" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 font-medium">{m.name}</span>
                    {m.price > 0 && <span className="tabular text-sm text-muted">+{formatJOD(m.price)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <label data-sheet-in className="mt-7 block">
        <span className="mb-3 block font-semibold">Note for the kitchen</span>
        <textarea
          value={notes}
          maxLength={200}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. no sugar"
          className="w-full resize-none rounded-xl border border-line px-4 py-3 outline-none transition-colors placeholder:text-muted/70 focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink"
        />
      </label>
    </Sheet>
  );
}
