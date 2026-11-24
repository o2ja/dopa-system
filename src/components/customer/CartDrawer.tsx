"use client";

import { ArrowRight, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatJOD } from "@/lib/money";
import { cartTotal, useCart, type CartLine } from "@/store/cart";
import { Sheet } from "./Sheet";

export function CartDrawer({ slug, lines, checkoutHref, canOrder, onClose }: { slug: string; lines: CartLine[]; checkoutHref: string; canOrder: boolean; onClose: () => void }) {
  const setQty = useCart((s) => s.setQty);
  return (
    <Sheet
      title="Your cart"
      side
      onClose={onClose}
      footer={
        lines.length > 0 && (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-muted">Total</span>
              <span className="tabular text-2xl font-semibold">{formatJOD(cartTotal(lines))}</span>
            </div>
            {canOrder ? (
              <Link href={checkoutHref} className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-paper transition hover:bg-ink-2 active:scale-[0.98]">
                Continue to checkout
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <p className="rounded-2xl bg-wine/10 p-3 text-center text-sm text-wine">This branch is closed, so the order can&apos;t be placed right now.</p>
            )}
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="grid place-items-center gap-3 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-paper-2">
            <ShoppingBag className="size-7 text-muted" />
          </span>
          <p className="text-lg font-semibold">Your cart is empty</p>
          <p className="max-w-56 text-sm text-muted">Pick something from the menu and it will show up here.</p>
          <button type="button" onClick={onClose} className="mt-2 min-h-11 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-ink-2 active:scale-95">
            Browse the menu
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.key} className="flex items-start gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.name}</p>
                {(l.variantName || l.modNames.length > 0) && (
                  <p className="mt-0.5 text-sm text-muted">{[l.variantName, ...l.modNames].filter(Boolean).join(" · ")}</p>
                )}
                {l.notes && <p className="mt-0.5 text-sm text-muted">&ldquo;{l.notes}&rdquo;</p>}
                <p className="tabular mt-1 text-sm font-medium">{formatJOD(l.unitPrice * l.quantity)}</p>
              </div>
              <div className="flex items-center rounded-full bg-paper-2" role="group" aria-label={`Quantity of ${l.name}`}>
                <button type="button" aria-label={`Decrease ${l.name}`} onClick={() => setQty(slug, l.key, l.quantity - 1)} className="grid size-11 place-items-center rounded-full transition-colors hover:bg-sand/60 active:scale-95">
                  <Minus className="size-4" />
                </button>
                <span className="tabular w-6 text-center font-semibold">{l.quantity}</span>
                <button type="button" aria-label={`Increase ${l.name}`} onClick={() => setQty(slug, l.key, l.quantity + 1)} className="grid size-11 place-items-center rounded-full transition-colors hover:bg-sand/60 active:scale-95">
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
