"use client";

import { useState } from "react";
import { Check, Loader2, Phone, X, ZoomIn, ZoomOut } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { api, hhmm } from "./api";
import { Modal, press } from "./ui";
import type { PosBranch, QueueOrder } from "./types";

const REASONS = ["Transfer not received", "Amount doesn't match", "Receipt unclear", "Suspicious receipt"];

export default function VerifyModal({ order, branch, onClose, onDone }: { order: QueueOrder; branch: PosBranch; onClose: () => void; onDone: (msg: string) => void }) {
  const [zoom, setZoom] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/pos/orders/${order.id}/verify`, { approve, reason });
      onDone(approve ? `Payment confirmed, order #${order.number} sent to print` : `Order #${order.number} rejected`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Verify CliQ payment · Order #${order.number}`} onClose={onClose} className="h-dvh sm:h-[92dvh] sm:max-w-6xl">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] md:grid-cols-[1.15fr_1fr] md:grid-rows-1">
        <div className="relative min-h-0 border-b border-line bg-ink/5 md:border-b-0 md:border-e">
          {order.receiptUrl ? (
            <>
              <div className="scroll-thin h-full overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.receiptUrl}
                  alt="CliQ receipt"
                  onClick={() => setZoom((z) => !z)}
                  className={`mx-auto ${zoom ? "w-[200%] max-w-none cursor-zoom-out" : "max-h-full w-auto max-w-full cursor-zoom-in object-contain"}`}
                />
              </div>
              <button onClick={() => setZoom((z) => !z)} className={`absolute bottom-3 start-3 flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-paper shadow-lift ${press}`}>
                {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
                {zoom ? "Fit" : "Zoom"}
              </button>
            </>
          ) : (
            <p className="grid h-full place-items-center text-muted">No receipt image</p>
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
            <div className="rounded-2xl bg-paper-2/70 p-4 sm:p-5">
              <p className="text-sm text-muted">Expected amount</p>
              <p className="tabular text-3xl font-semibold sm:text-4xl">{formatJOD(order.total)}</p>
              <p className="mt-3 text-sm text-muted">Should arrive at</p>
              <p className="text-xl font-semibold">{branch.cliqAlias}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Info label="Name" value={order.customerName || "—"} />
              <Info label="Phone" value={order.customerPhone ? <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-1.5 text-sky"><Phone className="size-4" />{order.customerPhone}</a> : "—"} />
              <Info label="Pickup time" value={order.pickupTime ? <span className="tabular">{hhmm(order.pickupTime)}</span> : "—"} />
              <Info label="Placed at" value={<span className="tabular">{hhmm(order.createdAt)}</span>} />
            </dl>
            {order.notes && <p className="rounded-xl bg-gold/10 p-3 text-gold-2">Note: {order.notes}</p>}
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 p-3">
                  <span className="tabular font-semibold">{i.quantity}×</span>
                  <span>
                    {i.name}
                    {i.variantName && <span className="text-muted"> · {i.variantName}</span>}
                    {i.modifiers.length > 0 && <span className="block text-sm text-muted">{i.modifiers.join(", ")}</span>}
                    {i.notes && <span className="block text-sm text-gold-2">{i.notes}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="shrink-0 space-y-3 border-t border-line p-3 sm:p-4">
            {error && <p className="text-wine">{error}</p>}
            {rejecting ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button key={r} onClick={() => setReason(r)} className={`h-11 rounded-full border px-4 text-sm ${press} ${reason === r ? "border-wine bg-wine text-paper" : "border-line bg-paper"}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <input className="h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-gold" placeholder="Or type a reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <button disabled={busy || !reason.trim()} onClick={() => decide(false)} className={`flex h-14 items-center justify-center gap-2 rounded-xl bg-wine text-lg font-semibold text-paper disabled:opacity-40 ${press}`}>
                    {busy && <Loader2 className="size-5 animate-spin" />} Confirm rejection
                  </button>
                  <button onClick={() => setRejecting(false)} className={`h-14 rounded-xl border border-line px-6 ${press}`}>Back</button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <button disabled={busy} onClick={() => decide(true)} className={`flex h-16 items-center justify-center gap-2 rounded-xl bg-sage text-base font-semibold text-paper disabled:opacity-40 sm:text-lg ${press}`}>
                  {busy ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-6" />} Confirm payment &amp; print
                </button>
                <button disabled={busy} onClick={() => setRejecting(true)} className={`flex h-16 items-center gap-2 rounded-xl border border-wine px-5 text-lg font-semibold text-wine ${press} hover:bg-wine/10 active:bg-wine/10`}>
                  <X className="size-5" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
