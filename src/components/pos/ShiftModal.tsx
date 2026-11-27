"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { formatJOD, toFils } from "@/lib/money";
import { api, hhmm } from "./api";
import { Modal, inputCls, press } from "./ui";

interface Report {
  shift: { id: string; status: string; cashierName: string; openingFloat: number; openedAt: string; closedAt: string | null; actualCash: number | null; variance: number | null; notes: string | null; branchName: string };
  sales: { cash: number; cliq: number; card: number; orderCount: number };
  expectedCash: number;
}

const varianceTone = (v: number) => (v === 0 ? "text-sage" : Math.abs(v) <= 1000 ? "text-gold-2" : "text-wine");

export default function ShiftModal({ shiftId, onClose, onClosed }: { shiftId: string; onClose: () => void; onClosed: () => void }) {
  const [r, setR] = useState<Report>();
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Report>(`/api/shifts/${shiftId}`).then(setR, (e) => setError(e.message));
  }, [shiftId]);

  const closed = r?.shift.status === "closed";
  const actualFils = closed ? r!.shift.actualCash! : toFils(actual || 0);
  const variance = r ? actualFils - r.expectedCash : 0;

  const close = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    setError("");
    try {
      setR(await api<Report>(`/api/shifts/${shiftId}/close`, { actualCash: actualFils, notes }));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
    setConfirm(false);
  };

  return (
    <Modal title={closed ? "Z-Report · Shift closed" : "Close shift / Z-Report"} onClose={closed ? onClosed : onClose} className="h-dvh sm:h-[92dvh] sm:max-w-3xl">
      {!r ? (
        <div className="grid flex-1 place-items-center">{error ? <p className="text-wine">{error}</p> : <Loader2 className="size-8 animate-spin text-muted" />}</div>
      ) : (
        <>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="zreport mx-auto max-w-xl">
              <div className="text-center">
                <h3 className="text-2xl font-semibold">Dopa · {r.shift.branchName}</h3>
                <p className="text-muted">End-of-shift report (Z)</p>
              </div>
              <dl className="mt-6 divide-y divide-line rounded-xl border border-line sm:text-lg">
                <Row k="Cashier" v={r.shift.cashierName} />
                <Row k="Opened" v={<span className="tabular">{hhmm(r.shift.openedAt)}</span>} />
                {r.shift.closedAt && <Row k="Closed" v={<span className="tabular">{hhmm(r.shift.closedAt)}</span>} />}
                <Row k="Paid orders" v={<span className="tabular">{r.sales.orderCount}</span>} />
                <Row k="Cash sales" v={formatJOD(r.sales.cash)} />
                <Row k="CliQ sales" v={formatJOD(r.sales.cliq)} />
                <Row k="Card / Visa sales" v={formatJOD(r.sales.card)} />
                <Row k="Total sales" v={formatJOD(r.sales.cash + r.sales.cliq + r.sales.card)} strong />
                <Row k="Opening float" v={formatJOD(r.shift.openingFloat)} />
                <Row k="Expected cash in drawer" v={formatJOD(r.expectedCash)} strong />
                <Row k="Counted cash" v={actualFils > 0 || closed ? formatJOD(actualFils) : "—"} />
                <Row k="Variance" v={<span className={`font-semibold ${varianceTone(variance)}`}>{actual || closed ? `${variance > 0 ? "+" : ""}${formatJOD(variance)}` : "—"}</span>} />
              </dl>
              {r.shift.notes && <p className="mt-3 text-muted">Notes: {r.shift.notes}</p>}
            </div>

            {!closed && (
              <div className="no-print mx-auto mt-6 max-w-xl space-y-4">
                <div>
                  <span className="mb-1.5 block text-sm text-muted">Actual cash counted in drawer (JOD)</span>
                  <input
                    className={`${inputCls} tabular`}
                    inputMode="decimal"
                    placeholder="0.000"
                    value={actual}
                    onChange={(e) => {
                      setActual(e.target.value.replace(/[^\d.]/g, ""));
                      setConfirm(false);
                    }}
                  />
                  {actual && (
                    <p className={`mt-2 text-lg font-semibold ${varianceTone(variance)}`}>
                      {variance === 0 ? "Exact match" : variance > 0 ? `Over by ${formatJOD(variance)}` : `Short by ${formatJOD(-variance)}`}
                    </p>
                  )}
                </div>
                <input className={inputCls} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
              </div>
            )}
            {error && <p className="mt-4 text-center text-wine">{error}</p>}
          </div>

          <div className="no-print grid shrink-0 grid-cols-[auto_1fr] gap-3 border-t border-line p-3 sm:p-4">
            <button onClick={() => window.print()} className={`flex h-16 items-center gap-2 rounded-xl border border-line px-5 font-semibold ${press} hover:bg-paper-2 active:bg-paper-2`}>
              <Printer className="size-5" /> Print
            </button>
            {closed ? (
              <button onClick={onClosed} className={`h-16 rounded-xl bg-ink text-lg font-semibold text-paper ${press}`}>Done</button>
            ) : (
              <button
                disabled={busy || actual === ""}
                onClick={close}
                className={`flex h-16 items-center justify-center gap-2 rounded-xl text-base font-semibold disabled:opacity-40 sm:text-lg ${press} ${confirm ? "border border-wine bg-card text-wine" : "bg-ink text-paper"}`}
              >
                {busy && <Loader2 className="size-5 animate-spin" />}
                {confirm ? "Tap again to confirm" : "Close shift"}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${strong ? "bg-paper-2 font-semibold" : ""}`}>
      <dt className="text-muted">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}
