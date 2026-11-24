import type { Metadata, Viewport } from "next";
import "@/components/pos/pos.css";

export const metadata: Metadata = {
  title: "POS",
  appleWebApp: { capable: true, title: "Dopa POS", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

// No pinch-zoom: it's an app surface, and accidental zoom breaks the layout on tablets.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <div className="pos-root fixed inset-0 overflow-hidden bg-paper">{children}</div>;
}
