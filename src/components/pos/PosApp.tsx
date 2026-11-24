"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Ban, BellRing, Check, ChevronDown, ClipboardList, Loader2, LogOut, Receipt, RefreshCw, ShieldCheck, Vault, Volume2, VolumeX, WifiOff } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { PAYMENT_LABEL, type PaymentMethod } from "@/types";
import { api, hhmm } from "./api";
import { chime, unlockAudio } from "./sound";
import { CountUp, gsap, reducedMotion, useGSAP } from "./motion";
import { Modal, press, useNow } from "./ui";
import Catalog from "./Catalog";
import ChargeSheet from "./ChargeSheet";
import ItemSheet from "./ItemSheet";
import QueueDrawer from "./QueueDrawer";
import Quick86 from "./Quick86";
import ShiftModal from "./ShiftModal";
import ShiftOpen from "./ShiftOpen";
import Ticket from "./Ticket";
import VerifyModal from "./VerifyModal";
import { lineTotal, type CartLine, type Modifier, type PosBranch, type PosCategory, type PosItem, type QueueOrder, type Shift, type Variant } from "./types";

type Overlay =
  | null
  | { k: "item"; item: PosItem }
  | { k: "charge"; method: PaymentMethod }
  | { k: "verify"; order: QueueOrder }
  | { k: "queue" }
  | { k: "quick86" }
  | { k: "shift" };

interface Toast { id: number; msg: string; err: boolean }

function Clock() {
  const now = useNow(15000);
  return <span className="tabular hidden text-sm text-muted sm:block">{now ? hhmm(now) : ""}</span>;
}

export default function PosApp({ branch }: { branch: PosBranch }) {
  const [shift, setShift] = useState<Shift | null | undefined>(undefined);
  const [categories, setCategories] = useState<PosCategory[]>();
  const [menuError, setMenuError] = useState("");
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [rush, setRush] = useState(0);
  const [online, setOnline] = useState(true);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [table, setTable] = useState("");
  const [note, setNote] = useState("");
  const [lastAdded, setLastAdded] = useState("");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const seq = useRef(0);
  const [lastCart, setLastCart] = useState<CartLine[]>([]);
  const known = useRef<Set<string> | null>(null);
  const soundRef = useRef(false);
  const busyRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const pendingCount = orders.filter((o) => o.status === "pending_verification").length;

  const toast = useCallback((msg: string, err = false) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), err ? 5000 : 3200);
  }, []);

  // ---- boot: remember branch, load shift + menu
  useEffect(() => {
    localStorage.setItem("pos-branch", branch.slug);
    api<{ shift: Shift | null }>(`/api/shifts?branchId=${branch.id}`).then((r) => setShift(r.shift), (e) => (toast(e.message, true), setShift(null)));
    api<{ categories: PosCategory[]; unavailable: string[] }>(`/api/pos/menu?branchId=${branch.id}`).then(
      (r) => (setCategories(r.categories), setUnavailable(new Set(r.unavailable))),
      (e) => setMenuError(e.message),
    );
  }, [branch, toast]);

  // ---- live queue (3s polling) + new-order chime
  const pollQueue = useCallback(async () => {
    try {
      const r = await api<{ orders: QueueOrder[]; rush: number; unavailable: string[] }>(`/api/pos/queue?branchId=${branch.id}`);
      const fresh = known.current ? r.orders.filter((o) => o.source !== "pos" && !known.current!.has(o.id)) : [];
      if (fresh.length) {
        if (soundRef.current) chime(fresh.some((o) => o.status === "pending_verification") ? "payment" : "order");
        toast(fresh.length === 1 ? `New order #${fresh[0].number}` : `${fresh.length} new orders`);
      }
      known.current = new Set(r.orders.map((o) => o.id));
      setOrders(r.orders);
      setRush(r.rush);
      setUnavailable(new Set(r.unavailable));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [branch.id, toast]);

  useEffect(() => {
    const first = setTimeout(pollQueue, 0);
    const t = setInterval(pollQueue, 3000);
    // iPad Safari throttles timers in the background: catch up the moment the tab is visible again
    const wake = () => document.visibilityState === "visible" && pollQueue();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => (clearTimeout(first), clearInterval(t), document.removeEventListener("visibilitychange", wake), window.removeEventListener("focus", wake));
  }, [pollQueue]);

  // ---- sound: iOS needs a tap before audio plays; a saved preference re-arms on the first tap
  useEffect(() => {
    const arm = () => {
      if (localStorage.getItem("pos-sound") === "1" && unlockAudio()) {
        soundRef.current = true;
        setSoundOn(true);
      }
    };
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);

  const toggleSound = () => {
    const on = !soundRef.current;
    if (on) {
      unlockAudio();
      chime("order");
    }
    soundRef.current = on;
    setSoundOn(on);
    localStorage.setItem("pos-sound", on ? "1" : "0");
  };

  // ---- cart
  const addLine = (item: PosItem, variant: Variant | null, mods: Modifier[]) => {
    const sig = (v: Variant | null, m: Modifier[]) => `${item.id}|${v?.id ?? ""}|${m.map((x) => x.id).sort().join(",")}`;
    const want = sig(variant, mods);
    const hit = lines.find((l) => !l.notes && sig(l.variant, l.modifiers) === want);
    const key = hit?.key ?? `l${++seq.current}`;
    setLines(hit ? lines.map((l) => (l === hit ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l)) : [...lines, { key, item, variant, modifiers: mods, quantity: 1, notes: "" }]);
    setLastAdded(`${key}#${++seq.current}`);
    setOverlay(null);
  };

  const pick = (item: PosItem) => {
    if (item.variants.length > 1 || item.modifierGroups.length > 0) setOverlay({ k: "item", item });
    else addLine(item, item.variants[0] ?? null, []);
  };

  const changeQty = (key: string, d: number) =>
    setLines((ls) => ls.flatMap((l) => (l.key !== key ? [l] : l.quantity + d <= 0 ? [] : [{ ...l, quantity: Math.min(99, l.quantity + d) }])));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));
  const clearCart = () => {
    setLines([]);
    setTable("");
    setNote("");
  };

  // ---- charge
  const startCharge = (method: PaymentMethod) => {
    if (!lines.length) return;
    setChargeError("");
    setOverlay({ k: "charge", method });
  };

  const submitCharge = async (method: PaymentMethod) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setCharging(true);
    setChargeError("");
    try {
      const res = await api<{ number: number; total: number }>("/api/pos/orders", {
        branchId: branch.id,
        paymentMethod: method,
        tableNumber: table || null,
        notes: note,
        items: lines.map((l) => ({ menuItemId: l.item.id, variantId: l.variant?.id ?? null, modifierIds: l.modifiers.map((m) => m.id), quantity: l.quantity, notes: l.notes })),
      });
      setLastCart(lines);
      clearCart();
      setOverlay(null);
      setTicketOpen(false);
      toast(`Order #${res.number} · ${formatJOD(res.total)} · ${PAYMENT_LABEL[method]}`);
      pollQueue();
    } catch (e) {
      setChargeError((e as Error).message);
    }
    busyRef.current = false;
    setCharging(false);
  };

  // ---- quick actions
  const openDrawer = () => api("/api/pos/drawer", { branchId: branch.id }).then(() => toast("Cash drawer opened"), (e) => toast(e.message, true));

  const toggle86 = async (item: PosItem) => {
    const soldOut = !unavailable.has(item.id);
    const apply = (off: boolean) =>
      setUnavailable((s) => {
        const n = new Set(s);
        if (off) n.add(item.id);
        else n.delete(item.id);
        return n;
      });
    apply(soldOut);
    try {
      await api("/api/pos/availability", { branchId: branch.id, itemId: item.id, isAvailable: !soldOut });
      toast(`${item.name} marked ${soldOut ? "sold out" : "available"}`);
    } catch (e) {
      apply(!soldOut);
      toast((e as Error).message, true);
    }
  };

  // ---- desktop shortcuts: F2/F3/F4 charge, "/" search, Q queue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlay?.k === "queue") return setOverlay(null);
      if (overlay || ticketOpen || !shift) return;
      const fkey = ({ F2: "cash", F3: "cliq", F4: "card" } as Record<string, PaymentMethod>)[e.key];
      if (fkey) {
        e.preventDefault();
        return startCharge(fkey);
      }
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "q" && !e.ctrlKey && !e.metaKey) setOverlay({ k: "queue" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ticketEl = (
    <Ticket
      lines={lines}
      total={total}
      table={table}
      note={note}
      canRepeat={lastCart.length > 0}
      disabled={lines.length === 0}
      lastAddedKey={lastAdded}
      onTable={setTable}
      onNote={setNote}
      onQty={changeQty}
      onRemove={removeLine}
      onLineNote={(key, v) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, notes: v } : l)))}
      onClear={clearCart}
      onRepeat={() => setLines(lastCart.map((l) => ({ ...l, key: `l${++seq.current}` })))}
      onCharge={startCharge}
    />
  );

  const rushDot = rush >= 8 ? "bg-wine" : rush >= 4 ? "bg-gold" : "bg-sage";

  const signOut = () => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      // full reload on purpose: drops all client state along with the session
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      location.href = "/login";
    });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line bg-card px-2 sm:gap-2 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="min-w-0">
              <Link href="/pos?change=1" title="Switch branch" className="flex min-h-11 items-center gap-1 rounded-xl px-2 font-semibold hover:bg-paper-2">
                <span className="truncate">{branch.name}</span>
                <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="sr-only">· switch branch</span>
              </Link>
            </h1>
            <Clock />
            {shift && (
              <span className="hidden items-center gap-2 text-sm text-ink-2 md:flex">
                <span className="size-2 rounded-full bg-sage" aria-hidden /> Shift open since <span className="tabular">{hhmm(shift.openedAt)}</span>
                <span className="hidden text-muted lg:inline">· {shift.cashierName}</span>
              </span>
            )}
            {shift === null && (
              <span className="hidden items-center gap-2 text-sm text-wine md:flex">
                <span className="size-2 rounded-full bg-wine" aria-hidden /> No open shift
              </span>
            )}
            <span className="tabular hidden items-center gap-2 text-sm text-ink-2 sm:flex" title="Orders in the last 15 minutes">
              <span className={`size-2 rounded-full ${rushDot}`} aria-hidden /> {rush} in 15 min
            </span>
            {!online && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-wine">
                <WifiOff className="size-4" /> <span className="hidden sm:inline">Offline</span>
              </span>
            )}
          </div>
        </div>

        <HeaderBtn label={soundOn ? "Sound alerts on" : "Enable sound alerts"} onClick={toggleSound} tone={soundOn ? "text-sage hover:bg-paper-2" : "border border-line text-ink hover:bg-paper-2"} showLabel={!soundOn}>
          {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </HeaderBtn>
        {shift && (
          <>
            <HeaderBtn label="Open cash drawer" onClick={openDrawer}>
              <Vault className="size-5" />
            </HeaderBtn>
            <HeaderBtn label="Quick 86" onClick={() => setOverlay({ k: "quick86" })} badge={unavailable.size || undefined}>
              <Ban className="size-5" />
            </HeaderBtn>
            <HeaderBtn label="Shift / Z-Report" onClick={() => setOverlay({ k: "shift" })}>
              <ClipboardList className="size-5" />
            </HeaderBtn>
          </>
        )}
        <HeaderBtn label="Orders" onClick={() => setOverlay({ k: "queue" })} badge={orders.length || undefined} alert={pendingCount > 0} tone="bg-ink text-paper" showLabel>
          <BellRing className="size-5" />
        </HeaderBtn>
        <span className="hidden sm:contents">
          <HeaderBtn label="Sign out" onClick={signOut} tone="text-muted hover:bg-paper-2">
            <LogOut className="size-5" />
          </HeaderBtn>
        </span>
      </header>

      {pendingCount > 0 && (
        <section aria-label="Pending CliQ verification" className="shrink-0 border-b border-gold/40 bg-paper-2">
          <div className="flex items-center gap-3 overflow-x-auto px-2 py-2 sm:px-4">
            <h2 className="flex shrink-0 items-center gap-2 text-sm font-semibold text-gold-2">
              <ShieldCheck className="size-4" aria-hidden /> Pending CliQ verification
              <span className="tabular font-normal">· {pendingCount}</span>
            </h2>
            {orders
              .filter((o) => o.status === "pending_verification")
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOverlay({ k: "verify", order: o })}
                  className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border border-gold bg-card px-4 text-sm ${press}`}
                >
                  <span className="tabular font-semibold">#{o.number}</span>
                  {o.customerName && <span className="max-w-32 truncate text-ink-2">{o.customerName}</span>}
                  <span className="tabular text-muted">{formatJOD(o.total)}</span>
                  <span className="font-semibold">Verify</span>
                </button>
              ))}
            <button onClick={pollQueue} aria-label="Refresh orders" className={`ms-auto grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-card ${press}`}>
              <RefreshCw className="size-4" />
            </button>
          </div>
        </section>
      )}

      {shift === undefined || !categories ? (
        <div className="grid flex-1 place-items-center text-muted">
          {menuError ? (
            <p className="flex items-center gap-2 text-wine"><AlertCircle className="size-5" /> {menuError}</p>
          ) : (
            <Loader2 className="size-8 animate-spin" />
          )}
        </div>
      ) : shift === null ? (
        <ShiftOpen branchId={branch.id} branchName={branch.name} defaultName={localStorage.getItem("pos-cashier") ?? ""} onOpen={setShift} />
      ) : (
        <>
          <div className="flex min-h-0 flex-1">
            <Catalog categories={categories} unavailable={unavailable} searchRef={searchRef} onPick={pick} onToggle86={toggle86} />
            <aside className="hidden w-[22rem] shrink-0 flex-col border-s border-line lg:flex xl:w-[26rem]">
              {ticketEl}
            </aside>
          </div>

          {lines.length > 0 && (
            <div className="shrink-0 border-t border-line bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
              <button onClick={() => setTicketOpen(true)} className={`flex h-14 w-full items-center justify-between rounded-xl bg-ink px-5 text-lg font-semibold text-paper ${press}`}>
                <span className="flex items-center gap-2">
                  <Receipt className="size-5" /> Charge
                  <span className="tabular text-base font-normal opacity-80">· {count}</span>
                </span>
                <CountUp value={total} className="tabular" />
              </button>
            </div>
          )}
          <p className="hidden shrink-0 border-t border-line bg-paper-2 px-4 py-1.5 text-xs text-muted xl:block">
            Shortcuts: <b>/</b> search · <b>F2</b> cash · <b>F3</b> CliQ · <b>F4</b> card · <b>Q</b> orders · <b>Esc</b> close
          </p>
        </>
      )}

      {ticketOpen && (
        <div className="lg:hidden">
          <Modal sheet title="Current ticket" onClose={() => setTicketOpen(false)} className="h-[88dvh] sm:max-w-lg">
            {ticketEl}
          </Modal>
        </div>
      )}

      {overlay?.k === "item" && <ItemSheet item={overlay.item} onClose={() => setOverlay(null)} onAdd={(v, m) => addLine(overlay.item, v, m)} />}
      {overlay?.k === "charge" && <ChargeSheet total={total} initial={overlay.method} branch={branch} busy={charging} error={chargeError} onClose={() => setOverlay(null)} onConfirm={submitCharge} />}
      {overlay?.k === "queue" && (
        <QueueDrawer
          orders={orders}
          onClose={() => setOverlay(null)}
          onVerify={(order) => setOverlay({ k: "verify", order })}
          onChanged={pollQueue}
          onError={(m) => toast(m, true)}
          onOk={toast}
        />
      )}
      {overlay?.k === "verify" && (
        <VerifyModal
          order={overlay.order}
          branch={branch}
          onClose={() => setOverlay({ k: "queue" })}
          onDone={(msg) => {
            toast(msg);
            setOverlay({ k: "queue" });
            pollQueue();
          }}
        />
      )}
      {overlay?.k === "quick86" && <Quick86 categories={categories ?? []} unavailable={unavailable} onToggle={toggle86} onClose={() => setOverlay(null)} />}
      {overlay?.k === "shift" && shift && (
        <ShiftModal
          shiftId={shift.id}
          onClose={() => setOverlay(null)}
          onClosed={() => {
            setOverlay(null);
            setShift(null);
            clearCart();
          }}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 flex flex-col items-center gap-2 px-3" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} err={t.err} msg={t.msg} />
        ))}
      </div>
    </div>
  );
}

function HeaderBtn({
  label,
  onClick,
  children,
  badge,
  alert,
  tone = "text-ink-2 hover:bg-paper-2",
  showLabel,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
  alert?: boolean;
  tone?: string;
  showLabel?: boolean;
}) {
  const badgeEl = useRef<HTMLSpanElement>(null);
  const prevBadge = useRef(badge);
  useGSAP(
    () => {
      const grew = badge !== undefined && badge > (prevBadge.current ?? 0);
      prevBadge.current = badge;
      if (grew && !reducedMotion()) gsap.fromTo(badgeEl.current, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
    },
    { dependencies: [badge] },
  );

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-medium ${tone} ${press} ${alert ? "pos-ring" : ""}`}
    >
      {children}
      <span className={showLabel ? "hidden md:inline" : "hidden xl:inline"}>{label}</span>
      {badge !== undefined && (
        <span ref={badgeEl} className={`tabular absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full px-1 text-xs font-semibold text-paper ${alert ? "bg-wine" : "bg-gold"}`}>{badge}</span>
      )}
    </button>
  );
}

function ToastItem({ msg, err }: { msg: string; err: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (reducedMotion()) return;
    // leaves just before the timer in PosApp removes it
    gsap.timeline({ defaults: { ease: "power2.out" } }).from(el.current, { y: -12, autoAlpha: 0, duration: 0.22 }).to(el.current, { y: -8, autoAlpha: 0, duration: 0.2, ease: "power1.in" }, (err ? 5000 : 3200) / 1000 - 0.25);
  });
  return (
    <div ref={el} className={`flex max-w-md items-center gap-2 rounded-xl border bg-card px-4 py-3 font-medium shadow-lift ${err ? "border-wine/40 text-wine" : "border-line text-ink"}`}>
      {err ? <AlertCircle className="size-5 shrink-0" /> : <Check className="size-5 shrink-0 text-sage" />}
      {msg}
    </div>
  );
}
