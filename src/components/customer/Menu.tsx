"use client";

import { ArrowLeft, Plus, QrCode, Search, SearchX, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatJOD } from "@/lib/money";
import { cartCount, cartTotal, useCart, useCartLines, useHydrated } from "@/store/cart";
import { CartDrawer } from "./CartDrawer";
import { hoursLabel } from "./hours";
import { ItemSheet } from "./ItemSheet";
import { defaultVariant, fromPrice, isSimple, type BranchDTO, type CategoryDTO, type ItemDTO } from "./types";

const norm = (s: string) => s.toLowerCase().trim();

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
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const q = norm(query);
  const visible = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, items: q ? c.items.filter((i) => norm(i.name).includes(q) || norm(i.description).includes(q)) : c.items }))
        .filter((c) => c.items.length),
    [categories, q],
  );

  useEffect(() => {
    const els = visible.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id.slice(4))),
      { rootMargin: "-210px 0px -65% 0px" },
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
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const quickAdd = (item: ItemDTO) => {
    const v = defaultVariant(item);
    add(branch.slug, {
      menuItemId: item.id, variantId: v?.id ?? null, modifierIds: [], quantity: 1, notes: "",
      name: item.name, variantName: v?.name ?? null, modNames: [], unitPrice: v?.price ?? item.basePrice,
    });
  };

  const checkoutHref = `/b/${branch.slug}/checkout${table ? `?table=${table}` : ""}`;
  const count = cartCount(lines);

  return (
    <>
      <div className="sticky top-0 z-30 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 md:px-8">
          <Link href="/" aria-label="Back to home" className="grid size-11 shrink-0 place-items-center rounded-full bg-paper-2 transition-colors hover:bg-sand active:scale-95">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight md:text-xl">{branch.name}</h1>
            <p className="text-xs text-muted">
              <span className={`me-1.5 inline-block size-2 rounded-full align-middle ${canOrder ? "bg-sage" : "bg-wine"}`} />
              {canOrder ? "Open" : "Closed"} · <span className="tabular">{hoursLabel(branch.hours)}</span>
            </p>
          </div>
          <label className="relative order-last w-full sm:order-none sm:w-64 lg:w-80">
            <span className="sr-only">Search the menu</span>
            <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu"
              className="h-11 w-full rounded-full bg-paper-2 ps-10 pe-4 outline-none placeholder:text-muted/80 focus-visible:ring-2 focus-visible:ring-gold"
            />
            <kbd className="pointer-events-none absolute inset-y-0 end-3 my-auto hidden h-6 items-center rounded-md bg-card px-2 text-xs text-muted lg:flex">/</kbd>
          </label>
        </div>
        <nav aria-label="Menu categories" className="mx-auto max-w-7xl">
          <div className="scroll-thin flex gap-2 overflow-x-auto px-4 py-3 md:px-8">
            {visible.map((c) => (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[c.id] = el;
                }}
                type="button"
                aria-current={active === c.id}
                onClick={() => goto(c.id)}
                className={`min-h-11 shrink-0 rounded-full px-5 font-medium transition active:scale-95 ${
                  active === c.id ? "bg-ink text-paper" : "bg-paper-2 text-ink-2 hover:bg-sand/70"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-32 md:px-8">
        {!canOrder ? (
          <Banner tone="wine" icon={<Store className="size-5" />} title="This branch is closed right now" text={`You can browse the menu. Ordering opens again during opening hours (${hoursLabel(branch.hours)}).`} />
        ) : table ? (
          <Banner tone="sage" icon={<QrCode className="size-5" />} title={`Table ${table}`} text="We'll bring your order to your table. Pay cash at the counter or with CliQ." />
        ) : (
          <Banner tone="sky" icon={<Store className="size-5" />} title="Pickup order" text="Order ahead, pay with CliQ, then collect it from the branch at the time you choose." />
        )}

        {visible.length === 0 && (
          <div className="grid place-items-center gap-3 py-24 text-center">
            <SearchX className="size-10 text-muted" />
            <p className="text-lg font-semibold">No results for &ldquo;{query}&rdquo;</p>
            <button type="button" onClick={() => setQuery("")} className="min-h-11 rounded-full bg-ink px-6 font-semibold text-paper hover:bg-ink-2 active:scale-95">
              Show the full menu
            </button>
          </div>
        )}

        {visible.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`h-${c.id}`} className="scroll-mt-52 pt-8">
            <h2 id={`h-${c.id}`} className="mb-4 text-2xl font-semibold md:text-3xl">{c.name}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {c.items.map((item) => (
                <ItemCard key={item.id} item={item} canOrder={canOrder} onOpen={() => setOpen(item)} onQuickAdd={() => quickAdd(item)} />
              ))}
            </ul>
          </section>
        ))}
      </main>

      {count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto mx-auto flex h-14 w-full max-w-md items-center justify-between gap-3 rounded-full bg-ink ps-5 pe-6 text-paper shadow-lift transition hover:bg-ink-2 active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-gold text-ink">
                <ShoppingBag className="size-4" />
              </span>
              <span className="font-semibold">
                View cart · <span className="tabular">{count}</span>
              </span>
            </span>
            <span className="tabular font-semibold">{formatJOD(cartTotal(lines))}</span>
          </button>
        </div>
      )}

      {open && <ItemSheet item={open} canOrder={canOrder} onAdd={(line) => add(branch.slug, line)} onClose={() => setOpen(null)} />}
      {cartOpen && <CartDrawer slug={branch.slug} lines={lines} checkoutHref={checkoutHref} canOrder={canOrder} onClose={() => setCartOpen(false)} />}
    </>
  );
}

function Banner({ tone, icon, title, text }: { tone: "wine" | "sage" | "sky"; icon: ReactNode; title: string; text: string }) {
  const bg = { wine: "bg-wine/10 text-wine", sage: "bg-sage/15 text-sage", sky: "bg-sky/10 text-sky" }[tone];
  return (
    <div role="status" className={`mt-2 flex items-start gap-3 rounded-2xl p-4 ${bg}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-ink-2">{text}</p>
      </div>
    </div>
  );
}

function ItemCard({ item, canOrder, onOpen, onQuickAdd }: { item: ItemDTO; canOrder: boolean; onOpen: () => void; onQuickAdd: () => void }) {
  const { price, from } = fromPrice(item);
  const sold = !item.available;
  const simple = isSimple(item);
  return (
    <li className={`relative flex items-stretch rounded-card bg-card transition-shadow ${sold ? "opacity-60" : "hover:shadow-soft"}`}>
      <button
        type="button"
        onClick={onOpen}
        disabled={sold}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-card p-3 text-start disabled:cursor-not-allowed"
      >
        <span
          aria-hidden
          className={`grid size-20 shrink-0 place-items-center rounded-2xl text-3xl font-semibold ${sold ? "bg-paper-2 text-muted" : "bg-sand/50 text-gold-2"}`}
        >
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 py-1 pe-10">
          <span className="block truncate font-semibold">{item.name}</span>
          {item.description && <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-muted">{item.description}</span>}
          <span className="tabular mt-1.5 block font-semibold">
            {sold ? <span className="text-wine">Sold out today</span> : <>{from && <span className="me-1 text-sm font-normal text-muted">from</span>}{formatJOD(price)}</>}
          </span>
        </span>
      </button>
      {!sold && canOrder && (
        <button
          type="button"
          aria-label={simple ? `Add ${item.name} to cart` : `Choose options for ${item.name}`}
          onClick={simple ? onQuickAdd : onOpen}
          className="absolute bottom-2 end-2 grid size-11 place-items-center rounded-full bg-ink text-paper transition hover:bg-ink-2 active:scale-90"
        >
          <Plus className="size-5" />
        </button>
      )}
    </li>
  );
}
