"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Printer, RotateCw } from "lucide-react";
import { api } from "./api";
import { btn, Field, iconBtn, inputCls, Notice, Toggle } from "./ui";
import { IPV4 } from "./validate";

export interface BranchData {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isOpen: boolean;
  cliqAlias: string;
  cliqName: string;
  coffeePrinterIp: string;
  kitchenPrinterIp: string;
  pizzaPrinterIp: string;
  cashierPrinterIp: string;
  tableCount: number;
}

export interface JobRow {
  id: string;
  station: string;
  jobType: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  orderNumber: number | null;
  at: string; // preformatted on the server
}

const STATION_LABEL: Record<string, string> = { coffee: "Coffee", kitchen: "Kitchen", pizza: "Pizza", cashier: "Cashier" };
const TYPE_LABEL: Record<string, string> = { ticket: "Ticket", receipt: "Receipt", open_drawer: "Open drawer" };
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Queued", cls: "text-sky" },
  printed: { label: "Printed", cls: "text-sage" },
  failed: { label: "Failed", cls: "text-wine" },
};

const PRINTERS = [
  ["coffeePrinterIp", "Coffee printer", "coffee"],
  ["kitchenPrinterIp", "Kitchen printer", "kitchen"],
  ["pizzaPrinterIp", "Pizza printer", "pizza"],
  ["cashierPrinterIp", "Cashier printer", "cashier"],
] as const;

export function BranchEditor({ branch, jobs }: { branch: BranchData; jobs: JobRow[] }) {
  const router = useRouter();
  const [f, setF] = useState(branch);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [station, setStation] = useState<(typeof PRINTERS)[number][2]>("cashier");
  const set = <K extends keyof BranchData>(k: K, v: BranchData[K]) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(branch);
  const badIp = PRINTERS.some(([k]) => f[k] && !IPV4.test(f[k]));

  async function save() {
    setBusy(true);
    const { id, slug, ...body } = f;
    void slug;
    const r = await api("PATCH", `/api/admin/branches/${id}`, body);
    setBusy(false);
    setMsg(r.ok ? { tone: "ok", text: "Saved" } : { tone: "error", text: r.error! });
    if (r.ok) router.refresh();
  }

  async function testPrint() {
    setBusy(true);
    const r = await api("POST", `/api/admin/branches/${branch.id}/test-print`, { station });
    setBusy(false);
    setMsg(r.ok ? { tone: "ok", text: "Test ticket queued" } : { tone: "error", text: r.error! });
    if (r.ok) router.refresh();
  }

  async function retry(id: string) {
    await api("POST", `/api/admin/print-jobs/${id}/retry`);
    router.refresh();
  }

  return (
    <section className="border-t border-line pt-6 sm:pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-xl font-semibold">{branch.name}</h2>
          <p className="text-xs text-muted">/b/{branch.slug}</p>
        </div>
        <Toggle checked={f.isOpen} onChange={(v) => set("isOpen", v)} label={f.isOpen ? "Open" : "Closed"} />
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className={inputCls} value={f.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Opening hours" hint="e.g. 08:00-24:00">
              <input className={inputCls} value={f.hours} onChange={(e) => set("hours", e.target.value)} />
            </Field>
            <Field label="Tables">
              <input
                className={inputCls}
                type="number"
                inputMode="numeric"
                min={0}
                max={200}
                value={f.tableCount}
                onChange={(e) => set("tableCount", Math.max(0, Math.round(Number(e.target.value) || 0)))}
              />
            </Field>
            <Field label="CliQ alias">
              <input className={inputCls} value={f.cliqAlias} onChange={(e) => set("cliqAlias", e.target.value)} />
            </Field>
            <Field label="CliQ account name">
              <input className={inputCls} value={f.cliqName} onChange={(e) => set("cliqName", e.target.value)} />
            </Field>
          </div>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold">Printer IPs (IPv4, port 9100)</legend>
            {PRINTERS.map(([k, label]) => {
              const invalid = !!f[k] && !IPV4.test(f[k]);
              return (
                <Field key={k} label={label}>
                  <input
                    className={`${inputCls} ${invalid ? "border-wine" : ""}`}
                    inputMode="decimal"
                    placeholder="192.168.1.50"
                    aria-invalid={invalid}
                    value={f[k]}
                    onChange={(e) => set(k, e.target.value.trim())}
                  />
                </Field>
              );
            })}
          </fieldset>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button className={btn("primary", "max-sm:w-full")} disabled={busy || !dirty || badIp} onClick={save}>
              Save changes
            </button>
            {badIp && <Notice tone="error">One of the printer IPs is not valid</Notice>}
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Print queue</h3>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select className={`${inputCls} !w-auto`} value={station} onChange={(e) => setStation(e.target.value as typeof station)} aria-label="Station for test print">
              {PRINTERS.map(([, , s]) => (
                <option key={s} value={s}>
                  {STATION_LABEL[s]}
                </option>
              ))}
            </select>
            <button className={btn("quiet")} disabled={busy} onClick={testPrint}>
              <Printer className="size-4" strokeWidth={1.75} aria-hidden />
              Test print
            </button>
          </div>

          {jobs.length === 0 ? (
            <p className="text-sm text-muted">No print jobs yet.</p>
          ) : (
            <ul className="divide-y divide-line/70 text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p>
                      {TYPE_LABEL[j.jobType] ?? j.jobType} · {STATION_LABEL[j.station] ?? j.station}
                      {j.orderNumber != null && <span className="tabular ms-1.5 text-muted">#{j.orderNumber}</span>}
                    </p>
                    {j.errorMessage && <p className="mt-0.5 break-words text-xs text-wine">{j.errorMessage}</p>}
                    <p className="tabular text-xs text-muted">{j.at}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className={`text-xs font-medium ${STATUS[j.status]?.cls}`}>{STATUS[j.status]?.label ?? j.status}</span>
                    {j.status === "failed" && (
                      <button className={iconBtn} onClick={() => retry(j.id)} aria-label="Retry job" title="Retry">
                        <RotateCw className="size-4" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
