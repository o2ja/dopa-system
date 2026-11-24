import { Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { hoursLabel } from "./hours";
import type { BranchDTO } from "./types";

export function Wordmark({ className = "", dim = "text-muted" }: { className?: string; dim?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-baseline gap-3 ${className}`}>
      <span className="font-display text-3xl font-medium leading-none tracking-tight">Dopa</span>
      <span className={`hidden text-sm sm:inline ${dim}`}>Cafe House &amp; Restaurant</span>
    </Link>
  );
}

export function TopBar({ action }: { action?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 md:px-8">
        <Wordmark />
        {action}
      </div>
    </header>
  );
}

/** Quiet status: a dot and a word, no chip. */
export function StatusBadge({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 text-sm font-medium ${open ? "text-sage" : "text-wine"} ${className}`}>
      <span className={`size-1.5 rounded-full ${open ? "bg-sage" : "bg-wine"}`} />
      {open ? "Open now" : "Closed"}
    </span>
  );
}

export function BranchFacts({ branch }: { branch: BranchDTO }) {
  return (
    <ul className="space-y-2">
      <li className="flex items-start gap-3">
        <MapPin className="mt-1 size-4 shrink-0 text-muted" />
        {branch.address}
      </li>
      <li className="flex items-center gap-3">
        <Clock className="size-4 shrink-0 text-muted" />
        <span className="tabular">{hoursLabel(branch.hours)}</span>
      </li>
      {branch.phone && (
        <li>
          <a href={`tel:${branch.phone}`} className="inline-flex min-h-11 items-center gap-3 underline-offset-4 hover:underline">
            <Phone className="size-4 shrink-0 text-muted" />
            <span className="tabular">{branch.phone}</span>
          </a>
        </li>
      )}
    </ul>
  );
}
