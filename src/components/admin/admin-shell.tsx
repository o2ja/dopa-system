"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AdminNav } from "./admin-nav";
import { iconBtn } from "./ui";

/** Sidebar on lg+, slide-in drawer below. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper-2/95 px-3 backdrop-blur-sm print:hidden lg:hidden">
        <button className={iconBtn} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <p className="text-lg font-bold tracking-tight">Dopa</p>
        <span className="size-11" aria-hidden />
      </header>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col border-e border-line bg-paper-2 px-4 py-5 transition-[transform,visibility] duration-250 ease-out print:hidden lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:px-5 lg:py-8 ${
          open ? "translate-x-0" : "max-lg:invisible -translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-start justify-between lg:mb-10">
          <div>
            <p className="text-2xl font-bold tracking-tight text-ink">Dopa</p>
            <p className="mt-0.5 text-xs text-muted">Admin</p>
          </div>
          <button className={`${iconBtn} -me-2 -mt-2 lg:hidden`} onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <AdminNav onNavigate={() => setOpen(false)} />
        <Link href="/pos" className="mt-auto flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted transition-colors hover:text-ink">
          Point of sale
          <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 print:p-0">{children}</main>
    </div>
  );
}
