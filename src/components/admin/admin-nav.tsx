"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, QrCode, Store, UtensilsCrossed } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Live sales", Icon: LayoutDashboard },
  { href: "/admin/menu", label: "Menu", Icon: UtensilsCrossed },
  { href: "/admin/branches", label: "Branches & printers", Icon: Store },
  { href: "/admin/qr", label: "QR codes", Icon: QrCode },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm transition-colors duration-150 ${
              active ? "border-line bg-card font-semibold text-ink" : "border-transparent text-muted hover:bg-card/60 hover:text-ink"
            }`}
          >
            <Icon className={`size-[1.125rem] ${active ? "text-gold" : ""}`} strokeWidth={1.75} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
