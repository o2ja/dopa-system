"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Modal, press } from "./ui";
import type { PosCategory, PosItem } from "./types";

export default function Quick86({ categories, unavailable, onToggle, onClose }: { categories: PosCategory[]; unavailable: Set<string>; onToggle: (item: PosItem) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const groups = categories
    .map((c) => ({ ...c, items: c.items.filter((i) => !needle || i.name.toLowerCase().includes(needle)) }))
    .filter((c) => c.items.length);

  return (
    <Modal
      title={
        <span>
          Quick 86 {unavailable.size > 0 && <span className="ms-2 text-sm font-normal text-wine">{unavailable.size} sold out</span>}
        </span>
      }
      onClose={onClose}
      className="h-dvh sm:h-[88dvh] sm:max-w-2xl"
    >
      <div className="shrink-0 border-b border-line p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="h-14 w-full rounded-xl border border-line bg-paper ps-12 pe-4 text-lg outline-none focus:border-gold" />
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {groups.length === 0 && <p className="mt-12 text-center text-muted">No items found</p>}
        {groups.map((c) => (
          <section key={c.id} className="mb-5">
            <h3 className="mb-2 px-1 text-sm text-muted">{c.name}</h3>
            <ul className="space-y-2">
              {c.items.map((i) => {
                const off = unavailable.has(i.id);
                return (
                  <li key={i.id}>
                    <button
                      onClick={() => onToggle(i)}
                      role="switch"
                      aria-checked={!off}
                      className={`flex h-16 w-full items-center justify-between rounded-xl border px-4 sm:px-5 ${press} ${off ? "border-wine/40 bg-wine/8" : "border-line bg-card hover:border-sand"}`}
                    >
                      <span className="text-start">
                        <span className={`font-semibold ${off ? "text-wine line-through decoration-1" : ""}`}>{i.name}</span>
                        <span className="block text-xs text-muted">{off ? "Sold out" : "Available"}</span>
                      </span>
                      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${off ? "bg-wine" : "bg-sage"}`}>
                        <span className={`absolute start-1 top-1 size-6 rounded-full bg-card shadow-soft transition-transform duration-200 ${off ? "" : "translate-x-6"}`} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
