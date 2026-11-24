"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Download, FileUp } from "lucide-react";
import { formatJOD } from "@/lib/money";
import { api } from "./api";
import { CSV_COLUMNS, CSV_TEMPLATE, type ImportRow, parseImportRow } from "./menu-import";
import { btn, Notice } from "./ui";

type Checked = { n: number; raw: Record<string, string> } & ({ row: ImportRow; errors?: undefined } | { errors: string[]; row?: undefined });

export function MenuImportPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<Checked[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = useMemo(() => (rows ?? []).filter((r) => r.row), [rows]);
  const invalid = (rows?.length ?? 0) - valid.length;

  function onFile(file: File) {
    setMsg(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, "").toLowerCase(),
      complete: (res) => {
        const missing = CSV_COLUMNS.filter((c) => !res.meta.fields?.includes(c));
        if (missing.length) {
          setRows(null);
          return setMsg({ tone: "error", text: `Missing columns: ${missing.join(", ")}` });
        }
        setRows(
          res.data.map((raw, i) => {
            const p = parseImportRow(raw);
            return { n: i + 2, raw, ...p } as Checked; // n = spreadsheet row (header is row 1)
          }),
        );
      },
      error: () => setMsg({ tone: "error", text: "Could not read that file" }),
    });
  }

  async function commit() {
    setBusy(true);
    const r = await api<{ created: number; updated: number; categoriesCreated: number }>("POST", "/api/admin/menu/import", { rows: valid.map((v) => v.raw) });
    setBusy(false);
    if (!r.ok) return setMsg({ tone: "error", text: r.error! });
    const { created, updated, categoriesCreated } = r.data;
    setMsg({ tone: "ok", text: `Imported: ${created} new, ${updated} updated, ${categoriesCreated} new categories` });
    setRows(null);
    setFileName("");
    router.refresh();
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "dopa-menu-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl">
      <p className="mb-1 text-sm text-muted">
        Columns: <span className="font-medium text-ink-2">{CSV_COLUMNS.join(", ")}</span>
      </p>
      <p className="mb-5 text-sm text-muted">
        Price is in JOD. Variants look like <span className="font-medium text-ink-2">Small:2.5|Medium:2.75|Large:3.25</span>. Categories match by name, items by name within the category.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className={btn("primary", "cursor-pointer max-sm:w-full")}>
          <FileUp className="size-4" strokeWidth={1.75} aria-hidden />
          Choose CSV file
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <button className={btn("quiet", "max-sm:w-full")} onClick={downloadTemplate}>
          <Download className="size-4" strokeWidth={1.75} aria-hidden />
          Download template
        </button>
        {fileName && <span className="truncate text-sm text-muted">{fileName}</span>}
      </div>

      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      {rows && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium text-sage">{valid.length} ready</span>
              {invalid > 0 && <span className="ms-3 font-medium text-wine">{invalid} with errors (will be skipped)</span>}
            </p>
            <button className={btn("primary", "max-sm:w-full")} disabled={busy || valid.length === 0} onClick={commit}>
              Import {valid.length} {valid.length === 1 ? "row" : "rows"}
            </button>
          </div>

          <div className="hidden grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_5rem_6rem_minmax(0,1.4fr)] gap-3 border-b border-line pb-2 text-xs text-muted md:grid">
            <span>Row</span>
            <span>Name</span>
            <span>Category</span>
            <span>Station</span>
            <span className="text-end">Price</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-line/70 border-y border-line/70 md:border-t-0">
            {rows.map((r) => (
              <li key={r.n} className="grid grid-cols-2 gap-x-3 gap-y-1 py-3 text-sm md:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_5rem_6rem_minmax(0,1.4fr)] md:items-start">
                <span className="tabular text-xs text-muted">#{r.n}</span>
                <span className="truncate font-medium max-md:order-first max-md:col-span-2">
                  {r.row?.name ?? (r.raw.name || "—")}
                </span>
                <span className="truncate text-muted">{r.row?.category ?? r.raw.category}</span>
                <span className="text-muted">{r.row?.station ?? r.raw.station}</span>
                <span className="tabular md:text-end">{r.row ? formatJOD(r.row.basePrice) : r.raw.price}</span>
                <span className={`col-span-2 md:col-span-1 ${r.errors ? "text-wine" : "text-sage"}`}>
                  {r.errors ? r.errors.join("; ") : r.row.variants.length ? `OK · ${r.row.variants.length} variants` : "OK"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
