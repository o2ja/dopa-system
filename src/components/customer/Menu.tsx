"use client";

import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatJOD } from "@/lib/money";
import { cartCount, cartTotal, useCart, useCartLines, useHydrated } from "@/store/cart";
import { StatusBadge } from "./Brand";
import { CartColumn, CartDrawer } from "./CartDrawer";
import { hoursLabel } from "./hours";
import { ItemSheet } from "./ItemSheet";
import { gsap, MOTION_OK, prefersReduced, ScrollTrigger, useGSAP } from "./motion";
import { defaultVariant, fromPrice, isSimple, type BranchDTO, type CategoryDTO, type ItemDTO } from "./types";

const norm = (s: string) => s.toLowerCase().trim();

/** A small dot travels from the item's add button to the cart, so the addition is felt. */
function flyToCart(itemId: string) {
  const from = document.querySelector<HTMLElement>(`[data-item="${itemId}"] [data-add]`);
  if (!from || prefersReduced()) return;
  const a = from.getBoundingClientRect();
  const target = window.matchMedia("(min-width: 1024px)").matches ? document.querySelector("[data-cart-target]")?.getBoundingClientRect() : null;
  const tx = target ? target.left + target.width / 2 : window.innerWidth / 2;
  const ty = target ? target.top + target.height / 2 : window.innerHeight - 44;
  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.className = "pointer-events-none fixed left-0 top-0 z-[60] size-3 rounded-full bg-ink";
  document.body.appendChild(dot);
  gsap.set(dot, { x: a.left + a.width / 2 - 6, y: a.top + a.height / 2 - 6 });
  gsap
    .timeline({ onComplete: () => dot.remove() })
    .to(dot, { x: tx - 6, duration: 0.65, ease: "power1.inOut" }, 0)
    .to(dot, { y: ty - 6, duration: 0.65, ease: "power2.in" }, 0)
    .to(dot, { scale: 0.4, duration: 0.65 }, 0)
    .fromTo(from, { scale: 1 }, { scale: 1.2, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, 0);
}

export function Menu({ branch, categories, table }: { branch: BranchDTO; categories: CategoryDTO[]; table: number | null }) {
  const canOrder = branch.isOpen;
  const hydrated = useHydrated();
  const stored = useCartLines(branch.slug);
  const lines = hydrated ? stored : [];
  const add = useCart((s) => s.add);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(categories[0]?.id);
  const [open, setOpen] = useState<ItemDTO | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const prevCount = useRef(0);

  const q = norm(query);
  const visible = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, items: q ? c.items.filter((i) => norm(i.name).includes(q) || norm(i.description).includes(q)) : c.items }))
        .filter((c) => c.items.length),
    [categories, q],
  );

  const checkoutHref = `/b/${branch.slug}/checkout${table ? `?table=${table}` : ""}`;
  const count = cartCount(lines);

  // Cards and headings rise in as their category scrolls into view. Opacity (not visibility) keeps unrevealed cards keyboard-reachable.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const targets = gsap.utils.toArray<HTMLElement>("[data-card], [data-cat-h]");
        gsap.set(targets, { opacity: 0, y: 24 });
        ScrollTrigger.batch(targets, {
          start: "top 94%",
          once: true,
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.06, overwrite: true }),
        });
      });
    },
    { scope: root },
  );

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [visible]);

  useGSAP(
    () => {
      if (count > prevCount.current && !prefersReduced()) {
        gsap.fromTo("[data-count]", { scale: 1.4 }, { scale: 1, duration: 0.55, ease: "back.out(3)" });
        gsap.fromTo("[data-bar]", { scale: 1.025 }, { scale: 1, duration: 0.5, ease: "power3.out" });
      }
      prevCount.current = count;
    },
    { scope: root, dependencies: [count] },
  );

  useEffect(() => {
    const els = visible.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id.slice(4))),
      { rootMargin: "-150px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (active) tabRefs.current[active]?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  // Desktop ergonomics: "/" jumps to search, like most menu/command UIs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (e.key === "/" && !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goto = (id: string) => {
    setActive(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
  };

  const addLine = (item: ItemDTO, line: Parameters<typeof add>[1]) => {
    add(branch.slug, line);
    flyToCart(item.id);
  };

  const quickAdd = (item: ItemDTO) => {
    const v = defaultVariant(item);
    addLine(item, {
      menuItemId: item.id, variantId: v?.id ?? null, modifierIds: [], quantity: 1, notes: "",
      name: item.name, variantName: v?.name ?? null, modNames: [], unitPrice: v?.price ?? item.basePrice,
    });
  };

  const cartProps = { slug: branch.slug, lines, checkoutHref, canOrder };

  return (
    <div ref={root} className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-8">
          <Link href="/" aria-label="Back to home" className="grid size-11 shrink-0 place-items-center rounded-full border border-line transition-[background-color,transform] hover:bg-paper-2 active:scale-95">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-medium leading-tight tracking-tight md:text-2xl">{branch.name}</h1>
            <p className="flex items-center gap-3 text-sm text-muted">
              <StatusBadge open={canOrder} />
              <span className="tabular">{hoursLabel(branch.hours)}</span>
            </p>
          </div>
        </div>
        <nav aria-label="Menu categories" className="mx-auto max-w-7xl">
          <div className="scroll-thin flex gap-1 overflow-x-auto px-2 md:px-6">
            {visible.map((c) => (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[c.id] = el;
                }}
                type="button"
                aria-current={active === c.id}
                onClick={() => goto(c.id)}
                className="relative min-h-12 shrink-0 px-3 font-medium text-muted transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 hover:text-ink aria-[current=true]:text-ink aria-[current=true]:after:scale-x-100"
              >
                {c.name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-16">
        <main className="pb-32 lg:pb-24">
          {!canOrder ? (
            <Notice dot="bg-wine" title="This branch is closed right now" text={`You can browse the menu. Ordering opens again during opening hours (${hoursLabel(branch.hours)}).`} />
          ) : table ? (
            <Notice dot="bg-sage" title={`Table ${table}`} text="We'll bring your order to your table. Pay cash at the counter or with CliQ." />
          ) : (
            <Notice dot="bg-gold" title="Pickup order" text="Order ahead, pay with CliQ, then collect it from the branch at the time you choose." />
          )}

          <label className="relative mt-5 block max-w-md">
            <span className="sr-only">Search the menu</span>
            <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto size-4 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu"
              className="h-12 w-full rounded-full border border-line bg-card ps-11 pe-10 outline-none transition-colors placeholder:text-muted/80 focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink"
            />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 end-4 hidden items-center text-sm text-muted lg:flex">/</span>
          </label>

          {visible.length === 0 && (
            <div className="py-24">
              <p className="font-display text-2xl">No results for &ldquo;{query}&rdquo;</p>
              <button type="button" onClick={() => setQuery("")} className="mt-5 min-h-11 rounded-full bg-ink px-6 font-semibold text-paper transition-[background-color,transform] hover:bg-ink-2 active:scale-95">
                Show the full menu
              </button>
            </div>
          )}

          {visible.map((c) => (
            <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`} className="scroll-mt-32 pt-12">
              <h2 id={`h-${c.id}`} data-cat-h className="mb-6 font-display text-3xl font-medium tracking-tight md:text-4xl">{c.name}</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {c.items.map((item) => (
                  <ItemCard key={item.id} item={item} canOrder={canOrder} onOpen={() => setOpen(item)} onQuickAdd={() => quickAdd(item)} />
                ))}
              </ul>
            </section>
          ))}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-[7.5rem] pt-8">
            <CartColumn {...cartProps} />
          </div>
        </aside>
      </div>

      <div
        inert={count === 0}
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
          count > 0 ? "translate-y-0 opacity-100" : "translate-y-[calc(100%+1rem)] opacity-0"
        }`}
      >
        <button
          type="button"
          data-bar
          onClick={() => setCartOpen(true)}
          className="pointer-events-auto mx-auto flex h-14 w-full max-w-md items-center justify-between gap-3 rounded-full bg-ink px-6 text-paper shadow-lift transition-colors hover:bg-ink-2"
        >
          <span className="flex items-baseline gap-2 font-semibold">
            View cart
            <span data-count className="tabular inline-block text-paper/75">{count}</span>
          </span>
          <span className="tabular font-semibold">{formatJOD(cartTotal(lines))}</span>
        </button>
      </div>

      {open && <ItemSheet item={open} canOrder={canOrder} onAdd={(line) => addLine(open, line)} onClose={() => setOpen(null)} />}
      {cartOpen && <CartDrawer {...cartProps} onClose={() => setCartOpen(false)} />}
    </div>
  );
}

function Notice({ dot, title, text }: { dot: string; title: string; text: string }) {
  return (
    <div role="status" className="mt-8 flex items-start gap-3 rounded-card border border-line p-4">
      <span className={`mt-2 size-2 shrink-0 rounded-full ${dot}`} />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{text}</p>
      </div>
    </div>
  );
}

function ItemCard({ item, canOrder, onOpen, onQuickAdd }: { item: ItemDTO; canOrder: boolean; onOpen: () => void; onQuickAdd: () => void }) {
  const { price, from } = fromPrice(item);
  const sold = !item.available;
  const simple = isSimple(item);
  return (
    <li data-card data-item={item.id} className={`flex flex-col rounded-card border border-line bg-card transition-colors ${sold ? "opacity-60" : "hover:border-ink/30"}`}>
      <button type="button" onClick={onOpen} disabled={sold} className="flex flex-1 flex-col items-start gap-1.5 rounded-t-card p-5 pb-3 text-start disabled:cursor-not-allowed">
        <span className="font-display text-xl font-medium leading-snug tracking-tight">{item.name}</span>
        {item.description && <span className="line-clamp-2 text-sm leading-relaxed text-muted">{item.description}</span>}
      </button>
      <div className="flex items-center justify-between gap-3 px-5 pb-4">
        <span className="tabular font-semibold">
          {sold ? <span className="text-wine">Sold out today</span> : <>{from && <span className="me-1.5 text-sm font-normal text-muted">from</span>}{formatJOD(price)}</>}
        </span>
        {!sold && canOrder && (
          <button
            type="button"
            data-add
            aria-label={simple ? `Add ${item.name} to cart` : `Choose options for ${item.name}`}
            onClick={simple ? onQuickAdd : onOpen}
            className="grid size-11 place-items-center rounded-full border border-line transition-[background-color,border-color,color] hover:border-ink hover:bg-ink hover:text-paper active:bg-ink-2"
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>
    </li>
  );
}
