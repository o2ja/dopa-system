"use client";

import { AlertCircle, ArrowLeft, Banknote, Check, Copy, Landmark, LoaderCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { formatJOD } from "@/lib/money";
import { cartCount, useCart, useCartLines, useHydrated } from "@/store/cart";
import { hoursLabel, pickupSlots } from "./hours";
import type { BranchDTO, ItemDTO } from "./types";

const PHONE = /^07[789]\d{7}$/;
const field =
  "h-12 w-full rounded-xl border border-line bg-card px-4 outline-none transition-colors placeholder:text-muted/70 focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink aria-[invalid=true]:border-wine";

export function Checkout({ branch, table, items }: { branch: BranchDTO; table: number | null; items: Record<string, ItemDTO> }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const stored = useCartLines(branch.slug);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const lines = hydrated ? stored : [];

  const dine = table !== null;
  const [method, setMethod] = useState<"cash" | "cliq">(dine ? "cash" : "cliq");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [slot, setSlot] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ busy: boolean; error: string; file: File | null }>({ busy: false, error: "", file: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const slots = useMemo(() => (hydrated ? pickupSlots(branch.hours) : []), [hydrated, branch.hours]);
  const chosenSlot = slot || slots[0]?.value || "";

  // Re-price from the live menu: the cart's stored prices are a snapshot and may be stale.
  const priced = lines.map((l) => {
    const it = items[l.menuItemId];
    const v = it?.variants.find((x) => x.id === l.variantId);
    const mods = l.modifierIds.map((id) => it?.groups.flatMap((g) => g.modifiers).find((m) => m.id === id));
    const ok = !!it && it.available && (!l.variantId || !!v) && mods.every(Boolean);
    const unit = ok ? (v?.price ?? it.basePrice) + mods.reduce((s, m) => s + m!.price, 0) : 0;
    return { ...l, ok, unit };
  });
  const total = priced.reduce((s, l) => s + l.unit * l.quantity, 0);
  const blocked = priced.some((l) => !l.ok);

  const nameOk = dine || name.trim().length > 1;
  const phoneOk = dine || PHONE.test(phone);
  const needReceipt = method === "cliq";
  const ready = lines.length > 0 && !blocked && branch.isOpen && nameOk && phoneOk && (dine || !!chosenSlot) && (!needReceipt || !!receipt);

  const send = async (file: File) => {
    setUpload({ busy: true, error: "", file });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      setReceipt(data.url);
      setUpload({ busy: false, error: "", file: null });
    } catch (e) {
      setReceipt(null);
      setUpload({ busy: false, error: e instanceof Error ? e.message : "Upload failed", file });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(branch.cliqAlias);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const submit = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          source: dine ? "qr" : "pickup",
          paymentMethod: method,
          tableNumber: table,
          customerName: dine ? undefined : name.trim(),
          customerPhone: dine ? undefined : phone,
          pickupTime: dine ? undefined : chosenSlot,
          receiptUrl: needReceipt ? receipt : null,
          items: lines.map((l) => ({ menuItemId: l.menuItemId, variantId: l.variantId, modifierIds: l.modifierIds, quantity: l.quantity, notes: l.notes })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error || "Couldn't place your order");
      clear(branch.slug);
      router.push(`/order/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't place your order");
      setSubmitting(false);
    }
  };

  const back = `/b/${branch.slug}${table ? `?table=${table}` : ""}`;

  if (!hydrated) return <CheckoutSkeleton />;

  if (lines.length === 0 && !submitting)
    return (
      <div className="py-24 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-muted">Add something from the {branch.name} menu.</p>
        <Link href={back} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-ink px-7 font-semibold text-paper transition-[background-color,transform] hover:bg-ink-2 active:scale-95">
          Back to the menu
        </Link>
      </div>
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-16">
      <aside className="rounded-card border border-line bg-card p-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
        <h2 className="font-display text-2xl font-medium tracking-tight">Order summary</h2>
        <ul className="mt-3 divide-y divide-line">
          {priced.map((l) => (
            <li key={l.key} className="flex items-start gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${l.ok ? "" : "text-muted line-through"}`}>
                  <span className="tabular">{l.quantity}×</span> {l.name}
                </p>
                {(l.variantName || l.modNames.length > 0) && <p className="text-sm text-muted">{[l.variantName, ...l.modNames].filter(Boolean).join(" · ")}</p>}
                {!l.ok && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-wine">
                    <AlertCircle className="size-4" /> No longer available
                    <button type="button" onClick={() => setQty(branch.slug, l.key, 0)} className="min-h-11 px-2 font-semibold underline">Remove</button>
                  </p>
                )}
              </div>
              {l.ok && <span className="tabular font-medium">{formatJOD(l.unit * l.quantity)}</span>}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-muted">Total ({cartCount(lines)} {cartCount(lines) === 1 ? "item" : "items"})</span>
          <span className="tabular font-display text-3xl font-medium tracking-tight">{formatJOD(total)}</span>
        </div>
      </aside>

      <div className="space-y-10 lg:col-start-1 lg:row-start-1">
        <div>
          <Link href={back} className="mb-5 inline-flex min-h-11 items-center gap-2 text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4" /> Back to the menu
          </Link>
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">Checkout</h1>
          <p className="mt-2 text-muted">
            {dine ? `Table ${table} · ${branch.name}` : `Pickup at ${branch.name} · ${hoursLabel(branch.hours)}`}
          </p>
        </div>

        {!branch.isOpen && (
          <p role="alert" className="rounded-card border border-wine/40 p-4 font-medium text-wine">This branch is closed right now, so the order can&apos;t be sent.</p>
        )}

        {dine ? (
          <fieldset>
            <legend className="mb-4 font-display text-2xl font-medium tracking-tight">Payment method</legend>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              <PayOption on={method === "cash"} onClick={() => setMethod("cash")} icon={<Banknote className="size-6" />} title="Cash" text="Pay at the counter" />
              <PayOption on={method === "cliq"} onClick={() => setMethod("cliq")} icon={<Landmark className="size-6" />} title="CliQ" text="Transfer and upload the receipt" />
            </div>
          </fieldset>
        ) : (
          <section className="space-y-5">
            <h2 className="font-display text-2xl font-medium tracking-tight">Pickup details</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} autoComplete="name" maxLength={80} placeholder="Your name" className={field} aria-invalid={touched && !nameOk} />
                {touched && !nameOk && <span className="mt-1.5 block text-sm text-wine">Enter your name</span>}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onBlur={() => phone && setTouched(true)}
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="07XXXXXXXX"
                  className={`${field} tabular`}
                  aria-invalid={touched && !phoneOk}
                />
                {touched && !phoneOk && <span className="mt-1.5 block text-sm text-wine">Use a Jordan mobile number, e.g. 0791234567</span>}
              </label>
            </div>
            <label className="block md:max-w-xs">
              <span className="mb-2 block text-sm font-medium">Pickup time (today)</span>
              {slots.length ? (
                <select value={chosenSlot} onChange={(e) => setSlot(e.target.value)} className={`${field} tabular`}>
                  {slots.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <p className="rounded-xl border border-wine/40 p-3 text-sm text-wine">No pickup times are left today before the branch closes.</p>
              )}
            </label>
          </section>
        )}

        {method === "cliq" && (
          <section aria-labelledby="cliq-h" className="rounded-card border border-line bg-card">
            <div className="p-6 md:p-8">
              <h2 id="cliq-h" className="font-display text-2xl font-medium tracking-tight">Transfer the amount with CliQ</h2>
              <p className="mt-5 text-sm text-muted">CliQ alias</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-4xl font-medium tracking-wide md:text-5xl">{branch.cliqAlias}</p>
                <button type="button" onClick={copy} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line px-5 font-medium transition-[background-color,transform] hover:bg-paper-2 active:scale-95">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy alias"}
                </button>
              </div>
              {branch.cliqName && <p className="mt-1 text-ink-2">{branch.cliqName}</p>}
              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-line pt-5">
                <span className="text-muted">Exact amount to transfer</span>
                <span className="tabular font-display text-3xl font-medium tracking-tight">{formatJOD(total)}</span>
              </div>
            </div>

            <div className="border-t border-line p-6 md:p-8">
              <h3 className="font-semibold">Upload your transfer receipt</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <label className="flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-sand px-4 py-3 text-center font-medium transition-colors hover:border-ink hover:bg-paper-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void send(f);
                      e.target.value = "";
                    }}
                  />
                  {upload.busy ? <LoaderCircle className="size-5 animate-spin" /> : receipt ? <Check className="size-5 text-sage" /> : <Upload className="size-5" />}
                  {upload.busy ? "Uploading..." : receipt ? "Receipt uploaded · tap to change" : "Choose receipt image"}
                </label>
                {receipt && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={receipt} alt="Uploaded CliQ receipt" className="max-h-48 w-full rounded-xl border border-line object-contain md:w-48" />
                )}
              </div>
              {upload.error && (
                <p role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-wine">
                  <AlertCircle className="size-4" /> {upload.error}
                  {upload.file && (
                    <button type="button" onClick={() => void send(upload.file!)} className="min-h-11 font-semibold underline">Try again</button>
                  )}
                </p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {dine
                  ? "The cashier checks the transfer, then your order goes to the kitchen."
                  : "Your order is confirmed, and preparation starts, only after the cashier verifies the transfer. You can follow its status live on the next page."}
              </p>
            </div>
          </section>
        )}

        {method === "cash" && dine && (
          <p className="rounded-card border border-line p-4 text-ink-2">
            Your order goes to the kitchen right away. You&apos;ll pay <span className="tabular font-semibold text-ink">{formatJOD(total)}</span> in cash at the counter.
          </p>
        )}

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-card border border-wine/40 p-4 font-medium text-wine">
            <AlertCircle className="size-5 shrink-0" /> {error}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !ready}
            className="flex h-14 w-full items-center justify-between gap-3 rounded-full bg-ink px-7 text-lg font-semibold text-paper transition-[background-color,transform] active:scale-[0.99] enabled:hover:bg-ink-2 disabled:bg-line disabled:text-muted"
          >
            <span className="flex items-center gap-2">
              {submitting && <LoaderCircle className="size-5 animate-spin" />}
              {submitting ? "Placing order..." : "Place order"}
            </span>
            <span className="tabular">{formatJOD(total)}</span>
          </button>
          {!ready && !submitting && (
            <p className="mt-3 text-center text-sm text-muted">
              {blocked
                ? "Remove the unavailable items to continue."
                : needReceipt && !receipt
                  ? "Upload your transfer receipt to place the order."
                  : !nameOk || !phoneOk
                    ? "Add your name and phone number."
                    : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PayOption({ on, onClick, icon, title, text }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex min-h-16 items-center gap-4 rounded-card border p-4 text-start transition-[border-color,transform] active:scale-[0.99] ${on ? "border-ink ring-1 ring-ink" : "border-line hover:border-sand"}`}
    >
      <span className={on ? "text-ink" : "text-muted"}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
    </button>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid animate-pulse gap-4" aria-busy aria-label="Loading">
      <div className="h-10 w-56 rounded-xl bg-paper-2" />
      <div className="h-48 rounded-card bg-paper-2" />
      <div className="h-14 rounded-full bg-paper-2" />
    </div>
  );
}
