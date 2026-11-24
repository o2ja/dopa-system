"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Display snapshot fields (names, unitPrice) are for UI only; the server reprices every order. */
export interface CartLine {
  key: string;
  menuItemId: string;
  variantId: string | null;
  modifierIds: string[];
  quantity: number;
  notes: string;
  name: string;
  variantName: string | null;
  modNames: string[];
  unitPrice: number;
}

interface CartState {
  carts: Record<string, CartLine[]>; // keyed by branch slug so branches never mix
  add: (slug: string, line: Omit<CartLine, "key">) => void;
  setQty: (slug: string, key: string, quantity: number) => void;
  clear: (slug: string) => void;
}

const lineKey = (l: Omit<CartLine, "key">) =>
  [l.menuItemId, l.variantId, [...l.modifierIds].sort().join("+"), l.notes.trim()].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      add: (slug, line) =>
        set((s) => {
          const key = lineKey(line);
          const lines = s.carts[slug] ?? [];
          const next = lines.some((l) => l.key === key)
            ? lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l))
            : [...lines, { ...line, key }];
          return { carts: { ...s.carts, [slug]: next } };
        }),
      setQty: (slug, key, quantity) =>
        set((s) => ({
          carts: {
            ...s.carts,
            [slug]: (s.carts[slug] ?? []).flatMap((l) =>
              l.key !== key ? [l] : quantity < 1 ? [] : [{ ...l, quantity: Math.min(99, quantity) }],
            ),
          },
        })),
      clear: (slug) => set((s) => ({ carts: { ...s.carts, [slug]: [] } })),
    }),
    // v2: line snapshot fields were renamed (English-only schema); old carts are dropped.
    { name: "dopa-cart", version: 2, migrate: () => ({ carts: {} }) },
  ),
);

const EMPTY: CartLine[] = [];
export const useCartLines = (slug: string) => useCart((s) => s.carts[slug] ?? EMPTY);

/** localStorage state differs from server HTML, so cart UI renders only after hydration. */
export const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0);
