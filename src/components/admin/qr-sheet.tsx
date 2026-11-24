"use client";

import { useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { btn, Field, inputCls } from "./ui";

interface QrBranch {
  id: string;
  slug: string;
  name: string;
  tableCount: number;
}

const noopSubscribe = () => () => {};

function Card({ url, branch, label, caption }: { url: string; branch: string; label: string; caption: string }) {
  return (
    <figure className="flex break-inside-avoid flex-col items-center gap-3 border border-dashed border-ink/40 bg-card px-3 py-6 text-center print:bg-white">
      <figcaption className="text-xs text-muted">Dopa · {branch}</figcaption>
      <QRCodeSVG value={url} size={148} level="M" marginSize={0} fgColor="#17202e" bgColor="transparent" className="size-auto max-w-full" />
      <p className="text-2xl font-bold leading-none text-ink">{label}</p>
      <p className="text-xs text-ink-2">{caption}</p>
    </figure>
  );
}

export function QrSheet({ branches }: { branches: QrBranch[] }) {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [custom, setCustom] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const base = (custom ?? origin).replace(/\/+$/, "");
  const branch = branches.find((b) => b.id === branchId);

  if (!branch) return <p className="text-sm text-muted">No branches yet.</p>;
  const root = `${base}/b/${branch.slug}`;

  return (
    <>
      <style>{`@media print { @page { size: A4; margin: 10mm } }`}</style>
      <div className="mb-8 grid gap-4 print:hidden sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
        <Field label="Branch">
          <select className={`${inputCls} sm:min-w-44`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Site address" hint="Encoded into every code. Set your real domain before printing.">
          <input className={inputCls} inputMode="url" value={custom ?? origin} onChange={(e) => setCustom(e.target.value)} placeholder="https://dopa.jo" />
        </Field>
        <button className={btn("primary", "max-lg:w-full sm:col-span-2 lg:col-span-1")} onClick={() => window.print()}>
          <Printer className="size-4" strokeWidth={1.75} aria-hidden />
          Print (A4)
        </button>
      </div>

      {base && (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 print:grid-cols-3">
          <Card url={root} branch={branch.name} label="Menu & order" caption="Scan to browse the menu" />
          {Array.from({ length: branch.tableCount }, (_, i) => i + 1).map((n) => (
            <Card key={n} url={`${root}?table=${n}`} branch={branch.name} label={`Table ${n}`} caption="Scan to order from your table" />
          ))}
        </div>
      )}
    </>
  );
}
