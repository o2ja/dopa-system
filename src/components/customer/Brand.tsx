import { Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { hoursLabel } from "./hours";
import type { BranchDTO } from "./types";

export function Wordmark({ className = "", dim = "text-muted" }: { className?: string; dim?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-baseline gap-2 ${className}`}>
      <span className="text-3xl font-bold leading-none tracking-tight">Dopa</span>
      <span className={`hidden text-sm sm:inline ${dim}`}>Cafe House &amp; Restaurant</span>
    </Link>
  );
}

export function TopBar({ action }: { action?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
      <Wordmark />
      {action}
    </header>
  );
}

export function StatusBadge({ open, onDark = false }: { open: boolean; onDark?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        open ? (onDark ? "bg-sage/30 text-paper" : "bg-sage/15 text-sage") : onDark ? "bg-wine/50 text-paper" : "bg-wine/10 text-wine"
      }`}
    >
      <span className={`size-2 rounded-full ${open ? (onDark ? "bg-[#8fb592]" : "bg-sage") : onDark ? "bg-paper/70" : "bg-wine"}`} />
      {open ? "Open now" : "Closed"}
    </span>
  );
}

export function BranchFacts({ branch }: { branch: BranchDTO }) {
  return (
    <ul className="space-y-2">
      <li className="flex items-start gap-3">
        <MapPin className="mt-1 size-4 shrink-0 opacity-60" />
        {branch.address}
      </li>
      <li className="flex items-center gap-3">
        <Clock className="size-4 shrink-0 opacity-60" />
        <span className="tabular">{hoursLabel(branch.hours)}</span>
      </li>
      {branch.phone && (
        <li>
          <a href={`tel:${branch.phone}`} className="inline-flex min-h-11 items-center gap-3 hover:underline">
            <Phone className="size-4 shrink-0 opacity-60" />
            <span className="tabular">{branch.phone}</span>
          </a>
        </li>
      )}
    </ul>
  );
}
