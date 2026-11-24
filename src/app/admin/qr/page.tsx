import type { Metadata } from "next";
import { Suspense } from "react";
import { QrSheet } from "@/components/admin/qr-sheet";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "QR codes" };

async function Sheet() {
  const branches = await db.branch.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true, tableCount: true },
  });
  return <QrSheet branches={branches} />;
}

export default function QrPage() {
  return (
    <>
      <div className="print:hidden">
        <PageHeader title="QR codes" sub="One card per table plus one for the branch, ready to print and cut on A4." />
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Sheet />
      </Suspense>
    </>
  );
}
