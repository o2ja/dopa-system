"use client";

import { ArrowRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { formatJOD } from "@/lib/money";
import { cartCount, cartTotal, useCart, type CartLine } from "@/store/cart";
import { gsap, prefersReduced, useGSAP } from "./motion";
import { Sheet } from "./Sheet";

interface CartProps {
  slug: string;
  lines: CartLine[];
  checkoutHref: string;
  canOrder: boolean;
}

const step = "grid size-10 place-items-center rounded-full transition-[background-color,transform] hover:bg-paper-2 active:scale-90";

function CartLines({ slug, lines, onBrowse }: { slug: string; lines: CartLine[]; onBrowse?: () => void }) {
  const setQty = useCart((s) => s.setQty);
  const list = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);

  // Lines added after the first render slide in; the initial set is shown as-is.
  useGSAP(
    () => {
      if (seen.current && !prefersReduced()) {
        list.current?.querySelectorAll<HTMLElement>("[data-line]").forEach((el) => {
          if (!seen.current?.has(el.dataset.line ?? "")) gsap.from(el, { autoAlpha: 0, x: -14, duration: 0.45, ease: "power3.out" });
        });
      }
      seen.current = new Set(lines.map((l) => l.key));
    },
    { scope: list, dependencies: [lines] },
  );

  return (
    <div ref={list}>
      {lines.length === 0 ? (
        <div className="py-12">
          <p className="font-display text-xl">Your cart is empty</p>
          <p className="mt-1 max-w-64 text-sm text-muted">Pick something from the menu and it will show up here.</p>
          {onBrowse && (
            <button type="button" onClick={onBrowse} className="mt-5 min-h-11 rounded-full border border-line px-6 font-semibold transition-[background-color,transform] hover:bg-paper-2 active:scale-95">
              Browse the menu
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.key} data-line={l.key} className="flex items-start gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.name}</p>
                {(l.variantName || l.modNames.length > 0) && (
                  <p className="mt-0.5 text-sm text-muted">{[l.variantName, ...l.modNames].filter(Boolean).join(" · ")}</p>
                )}
                {l.notes && <p className="mt-0.5 text-sm text-muted">&ldquo;{l.notes}&rdquo;</p>}
                <p className="tabular mt-1.5 text-sm font-medium">{formatJOD(l.unitPrice * l.quantity)}</p>
              </div>
              <div className="flex shrink-0 items-center rounded-full border border-line" role="group" aria-label={`Quantity of ${l.name}`}>
                <button type="button" aria-label={`Decrease ${l.name}`} onClick={() => setQty(slug, l.key, l.quantity - 1)} className={step}>
                  <Minus className="size-4" />
                </button>
                <span className="tabular w-6 text-center font-semibold">{l.quantity}</span>
                <button type="button" aria-label={`Increase ${l.name}`} onClick={() => setQty(slug, l.key, l.quantity + 1)} className={step}>
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartTotal({ lines, checkoutHref, canOrder }: Omit<CartProps, "slug">) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-muted">Total</span>
        <span className="tabular font-display text-3xl font-medium tracking-tight">{formatJOD(cartTotal(lines))}</span>
      </div>
      {canOrder ? (
        <Link href={checkoutHref} className="flex h-14 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-paper transition-[background-color,transform] hover:bg-ink-2 active:scale-[0.98]">
          Continue to checkout
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <p className="rounded-xl border border-wine/30 p-3 text-center text-sm text-wine">This branch is closed, so the order can&apos;t be placed right now.</p>
      )}
    </div>
  );
}

/** Persistent cart beside the menu on wide screens. */
export function CartColumn(props: CartProps) {
  const count = cartCount(props.lines);
  return (
    <section aria-labelledby="cart-h" className="flex max-h-[calc(100dvh-9.5rem)] flex-col rounded-card border border-line bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-6 py-5">
        <h2 id="cart-h" data-cart-target className="font-display text-2xl font-medium tracking-tight">Your order</h2>
        {count > 0 && <span data-count className="tabular inline-block text-sm text-muted">{count} {count === 1 ? "item" : "items"}</span>}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6">
        <CartLines slug={props.slug} lines={props.lines} />
      </div>
      {props.lines.length > 0 && (
        <div className="border-t border-line px-6 py-5">
          <CartTotal lines={props.lines} checkoutHref={props.checkoutHref} canOrder={props.canOrder} />
        </div>
      )}
    </section>
  );
}

export function CartDrawer({ onClose, ...props }: CartProps & { onClose: () => void }) {
  return (
    <Sheet
      title="Your cart"
      side
      onClose={onClose}
      footer={props.lines.length > 0 && <CartTotal lines={props.lines} checkoutHref={props.checkoutHref} canOrder={props.canOrder} />}
    >
      <CartLines slug={props.slug} lines={props.lines} onBrowse={onClose} />
    </Sheet>
  );
}
