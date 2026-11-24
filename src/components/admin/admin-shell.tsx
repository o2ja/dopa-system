"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import { gsap, useGSAP } from "../pos/motion";
import { AdminNav } from "./admin-nav";
import { iconBtn } from "./ui";

const DRAWER_ONLY = "(max-width: 1023px) and (prefers-reduced-motion: no-preference)";

function signOut() {
  fetch("/api/auth/logout", { method: "POST" }).finally(() => {
    // full reload on purpose: drops all client state along with the session
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = "/login";
  });
}

/** Sidebar on lg+, slide-in drawer below. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const aside = useRef<HTMLElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const openNow = useRef(false);

  useEffect(() => {
    openNow.current = open;
    if (open) tl.current?.play();
    else tl.current?.reverse();
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Drawer timeline only exists on small screens with motion allowed. Everywhere else the
  // max-lg:visible / max-lg:invisible classes below show and hide the drawer instantly.
  useGSAP(() => {
    gsap.matchMedia().add(DRAWER_ONLY, () => {
      const t = gsap
        .timeline({ paused: true, defaults: { ease: "power2.out" } })
        .fromTo(aside.current, { xPercent: -100, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.22 })
        .fromTo(scrim.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0);
      tl.current = t;
      if (openNow.current) t.progress(1);
      return () => {
        tl.current = null;
      };
    });
  });

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper-2 px-3 print:hidden lg:hidden">
        <button className={iconBtn} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <p className="font-display text-xl font-medium">Dopa</p>
        <span className="size-11" aria-hidden />
      </header>

      <div
        ref={scrim}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink/25 lg:hidden ${open ? "visible" : "pointer-events-none invisible"}`}
        aria-hidden
      />
      <aside
        ref={aside}
        className={`fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col border-e border-line bg-paper-2 px-4 py-5 print:hidden lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:px-5 lg:py-8 ${
          open ? "visible" : "invisible"
        }`}
      >
        <div className="mb-8 flex items-start justify-between lg:mb-10">
          <div>
            <p className="font-display text-2xl font-medium text-ink">Dopa</p>
            <p className="mt-0.5 text-xs text-muted">Admin</p>
          </div>
          <button className={`${iconBtn} -me-2 -mt-2 lg:hidden`} onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <AdminNav onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex flex-col">
          <Link href="/pos" className="flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted transition-colors hover:text-ink">
            Point of sale
            <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
          </Link>
          <button type="button" onClick={signOut} className="flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted transition-colors hover:text-ink">
            Sign out
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 print:p-0">{children}</main>
    </div>
  );
}
