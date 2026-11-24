"use client";

import { useRef, useState, type RefObject } from "react";
import { Ban, Search, Star } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { press } from "./ui";
import type { PosCategory, PosItem } from "./types";

const POPULAR = "__popular";

function Tile({ item, off, onTap, onLongPress }: { item: PosItem; off: boolean; onTap: () => void; onLongPress: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fired = useRef(false);
  const price = item.variants.length ? Math.min(...item.variants.map((v) => v.price)) : item.basePrice;

  const start = () => {
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      navigator.vibrate?.(30);
      onLongPress();
    }, 650);
  };
  const stop = () => clearTimeout(timer.current);

  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      onClick={() => !fired.current && !off && onTap()}
      className={`relative flex min-h-24 flex-col justify-between rounded-2xl border p-3 text-start sm:min-h-28 sm:p-4 ${press} ${
        off ? "border-dashed border-line bg-paper-2/60 opacity-55" : "border-line bg-card shadow-soft hover:border-sand active:bg-paper-2"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-semibold leading-snug sm:text-lg">{item.name}</span>
        {item.isPopular && !off && <Star className="mt-1 size-4 shrink-0 fill-gold text-gold" />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        {off ? (
          <span className="flex items-center gap-1 text-sm font-medium text-wine">
            <Ban className="size-4" /> Sold out
          </span>
        ) : (
          <span className="tabular text-sm font-semibold text-gold-2 sm:text-base">
            {item.variants.length > 1 && <span className="me-1 text-xs font-normal text-muted">from</span>}
            {formatJOD(price)}
          </span>
        )}
        {!off && (item.variants.length > 1 || item.modifierGroups.length > 0) && <span className="text-xs text-muted">Options</span>}
      </div>
    </button>
  );
}

export default function Catalog({
  categories,
  unavailable,
  searchRef,
  onPick,
  onToggle86,
}: {
  categories: PosCategory[];
  unavailable: Set<string>;
  searchRef: RefObject<HTMLInputElement | null>;
  onPick: (item: PosItem) => void;
  onToggle86: (item: PosItem) => void;
}) {
  const popular = categories.flatMap((c) => c.items).filter((i) => i.isPopular);
  const [active, setActive] = useState(popular.length ? POPULAR : (categories[0]?.id ?? ""));
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const items = needle
    ? categories.flatMap((c) => c.items).filter((i) => i.name.toLowerCase().includes(needle))
    : active === POPULAR
      ? popular
      : (categories.find((c) => c.id === active)?.items ?? []);
  const tabs = [...(popular.length ? [{ id: POPULAR, name: "Popular" }] : []), ...categories];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <nav className="scroll-thin flex shrink-0 gap-2 overflow-x-auto border-b border-line bg-paper-2/50 p-2 md:w-40 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-e md:p-3 xl:w-44">
        {tabs.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActive(c.id);
              setQ("");
            }}
            className={`shrink-0 rounded-xl px-4 py-3 text-start font-semibold md:py-4 ${press} ${!needle && active === c.id ? "bg-ink text-paper shadow-soft" : "text-ink-2 hover:bg-paper-2 active:bg-paper-2"}`}
          >
            {c.name}
          </button>
        ))}
      </nav>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 p-3 pb-0 sm:p-4 sm:pb-0">
          <div className="relative">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const first = items.find((i) => !unavailable.has(i.id));
                  if (first) {
                    onPick(first);
                    setQ("");
                  }
                } else if (e.key === "Escape") {
                  setQ("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search items"
              className="h-12 w-full rounded-xl border border-line bg-card ps-12 pe-4 outline-none transition-colors focus:border-gold"
            />
            <kbd className="pointer-events-none absolute end-4 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted xl:block">/</kbd>
          </div>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {items.length === 0 && <p className="mt-16 text-center text-muted">No items found</p>}
          <div key={needle ? "search" : active} className="pos-fade grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2.5 sm:gap-3">
            {items.map((item) => (
              <Tile key={item.id} item={item} off={unavailable.has(item.id)} onTap={() => onPick(item)} onLongPress={() => onToggle86(item)} />
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted">Press and hold an item (or right-click) to mark it sold out / available</p>
        </div>
      </section>
    </div>
  );
}
