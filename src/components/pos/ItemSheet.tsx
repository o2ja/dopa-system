"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { Modal, press } from "./ui";
import type { Modifier, PosItem, Variant } from "./types";

export default function ItemSheet({ item, onClose, onAdd }: { item: PosItem; onClose: () => void; onAdd: (variant: Variant | null, mods: Modifier[]) => void }) {
  const [variant, setVariant] = useState<Variant | null>(item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null);
  // required groups start with their first option so "Add" is one tap
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(item.modifierGroups.map((g) => [g.id, g.minSelect > 0 ? g.modifiers.slice(0, g.minSelect).map((m) => m.id) : []])),
  );

  const toggle = (gid: string, mid: string, max: number, min: number) =>
    setPicked((p) => {
      const cur = p[gid];
      if (cur.includes(mid)) return cur.length <= min && min > 0 ? p : { ...p, [gid]: cur.filter((x) => x !== mid) };
      if (max === 1) return { ...p, [gid]: [mid] };
      return cur.length >= max ? p : { ...p, [gid]: [...cur, mid] };
    });

  const mods = item.modifierGroups.flatMap((g) => g.modifiers.filter((m) => picked[g.id].includes(m.id)));
  const valid = item.modifierGroups.every((g) => picked[g.id].length >= g.minSelect);
  const total = (variant?.price ?? item.basePrice) + mods.reduce((s, m) => s + m.price, 0);

  return (
    <Modal sheet onClose={onClose} title={item.name} className="sm:max-w-2xl">
      <div className="scroll-thin flex-1 space-y-7 overflow-y-auto p-4 sm:p-6">
        {item.variants.length > 1 && (
          <section>
            <h3 className="mb-3 text-sm text-muted">Size</h3>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {item.variants.map((v) => (
                <Chip key={v.id} active={variant?.id === v.id} onClick={() => setVariant(v)}>
                  <span className="font-semibold">{v.name}</span>
                  <span className="tabular text-sm opacity-80">{formatJOD(v.price)}</span>
                </Chip>
              ))}
            </div>
          </section>
        )}
        {item.modifierGroups.map((g) => (
          <section key={g.id}>
            <h3 className="mb-3 text-sm text-muted">
              {g.name}
              {g.minSelect > 0 ? " · Required" : g.maxSelect > 1 ? ` · Up to ${g.maxSelect}` : " · Optional"}
            </h3>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {g.modifiers.map((m) => (
                <Chip key={m.id} active={picked[g.id].includes(m.id)} onClick={() => toggle(g.id, m.id, g.maxSelect, g.minSelect)}>
                  <span className="font-semibold">{m.name}</span>
                  {m.price > 0 && <span className="tabular text-sm opacity-80">+{formatJOD(m.price)}</span>}
                </Chip>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="border-t border-line p-3 sm:p-4">
        <button
          disabled={!valid}
          autoFocus
          onClick={() => onAdd(variant, mods)}
          className={`flex h-16 w-full items-center justify-between rounded-xl bg-ink px-6 text-lg font-semibold text-paper disabled:opacity-40 ${press}`}
        >
          <span>Add to ticket</span>
          <span className="tabular">{formatJOD(total)}</span>
        </button>
      </div>
    </Modal>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 sm:px-5 ${press} ${active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-sand active:bg-paper-2"}`}
    >
      {active && <Check className="size-4" />}
      {children}
    </button>
  );
}
