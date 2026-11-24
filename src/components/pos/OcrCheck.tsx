import { Check, Loader2, TriangleAlert, X } from "lucide-react";
import type { ReceiptVerification } from "@/types";

const TONE = {
  verified: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  failed: "border-rose-300 bg-rose-50 text-rose-800",
};

/** Compact OCR result for queue cards. null = OCR still running in the background. */
export function OcrBadge({ v }: { v: ReceiptVerification | null }) {
  if (!v)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm text-muted">
        <Loader2 className="size-3.5 animate-spin" /> Reading receipt…
      </span>
    );
  const ok = v.status === "verified";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${TONE[v.status]}`}>
      {ok ? <Check className="size-4" /> : <TriangleAlert className="size-4" />}
      {ok ? "OCR Verified ✓" : "Check Manually ⚠"}
    </span>
  );
}

/** Full checklist for the verify modal. */
export function OcrChecklist({ v }: { v: ReceiptVerification | null }) {
  const rows: [string, boolean][] = v
    ? [
        ["Completed Transfer", v.checks.isCompleted],
        ["Amount Match", v.checks.amountMatched],
        ["Alias Match", v.checks.aliasMatched],
        ["Unique Image", !v.checks.isDuplicate],
      ]
    : [];
  return (
    <div className={`rounded-xl border p-4 ${v ? TONE[v.status] : "border-line"}`}>
      <OcrBadge v={v} />
      {v && (
        <>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {rows.map(([label, pass]) => (
              <li key={label} className="flex items-center gap-2 font-medium">
                {pass ? <Check className="size-4 text-emerald-700" /> : <X className="size-4 text-rose-700" />}
                {label}
              </li>
            ))}
          </ul>
          {v.reasons.length > 0 && (
            <ul className="mt-3 list-disc space-y-0.5 ps-5 text-sm">
              {v.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
