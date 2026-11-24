"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { formatJOD } from "@/lib/money";
import type { CartLine } from "@/store/cart";
import { Sheet } from "./Sheet";
import { defaultVariant, type ItemDTO } from "./types";

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

  return (
    <Sheet
      title={item.name}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full bg-card" role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center rounded-full transition-colors hover:bg-sand/50 active:scale-95">
              <Minus className="size-4" />
            </button>
            <span className="tabular w-8 text-center font-semibold" aria-live="polite">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-11 place-items-center rounded-full transition-colors hover:bg-sand/50 active:scale-95">
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
            className="flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-full bg-ink px-6 font-semibold text-paper transition active:scale-[0.98] enabled:hover:bg-ink-2 disabled:bg-muted/40 disabled:text-muted"
          >
            <span className="truncate">
              {!item.available ? "Sold out today" : !canOrder ? "Branch closed" : missing ? `Choose ${missing.name}` : "Add to cart"}
            </span>
            <span className="tabular shrink-0">{formatJOD(unit * qty)}</span>
          </button>
        </div>
      }
    >
      {item.description && <p className="leading-relaxed text-ink-2">{item.description}</p>}

      {item.variants.length > 1 && (
        <fieldset className="mt-6">
          <legend className="mb-2 font-semibold">Size</legend>
          <div className="flex flex-wrap gap-2">
            {item.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === variantId}
                onClick={() => setVariantId(v.id)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-2xl px-5 py-1.5 transition active:scale-95 ${
                  v.id === variantId ? "bg-ink text-paper" : "bg-paper-2 hover:bg-sand/60"
                }`}
              >
                <span className="font-medium">{v.name}</span>
                <span className="tabular text-xs opacity-70">{formatJOD(v.price)}</span>
              </button>
            ))}
          </div>
          {showUpsell && (
            <button
              type="button"
              onClick={() => setVariantId(meal.id)}
              className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl bg-sand/50 px-4 py-2 text-start transition hover:bg-sand active:scale-[0.99]"
            >
              <span className="font-medium">Make it a meal</span>
              <span className="tabular rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper">+{formatJOD(meal.price - (variant?.price ?? 0))}</span>
            </button>
          )}
        </fieldset>
      )}

      {item.groups.map((g) => (
        <fieldset key={g.id} className="mt-6">
          <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
            <span className="font-semibold">{g.name}</span>
            <span className="text-xs text-muted">
              {g.minSelect >= 1 ? "Required" : "Optional"}
              {g.maxSelect > 1 && ` · up to ${g.maxSelect}`}
            </span>
          </legend>
          <div className="space-y-1.5">
            {g.modifiers.map((m) => {
              const on = (picked[g.id] ?? []).includes(m.id);
              const full = !on && g.maxSelect > 1 && (picked[g.id] ?? []).length >= g.maxSelect;
              return (
                <button
                  key={m.id}
                  type="button"
                  role={g.maxSelect === 1 ? "radio" : "checkbox"}
                  aria-checked={on}
                  disabled={full}
                  onClick={() => toggle(g.id, m.id, g.maxSelect)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-2 text-start transition active:scale-[0.99] disabled:opacity-40 ${
                    on ? "bg-ink text-paper" : "bg-paper-2 hover:bg-sand/60"
                  }`}
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center border-2 ${g.maxSelect === 1 ? "rounded-full" : "rounded-md"} ${on ? "border-gold bg-gold" : "border-muted/50"}`}
                  >
                    {on && <Check className="size-3 text-ink" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 font-medium">{m.name}</span>
                  {m.price > 0 && <span className="tabular text-sm opacity-75">+{formatJOD(m.price)}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <label className="mt-6 block">
        <span className="mb-2 block font-semibold">Note for the kitchen</span>
        <textarea
          value={notes}
          maxLength={200}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. no sugar"
          className="w-full resize-none rounded-2xl bg-paper-2 px-4 py-3 outline-none placeholder:text-muted/70 focus-visible:ring-2 focus-visible:ring-gold"
        />
      </label>
    </Sheet>
  );
}
