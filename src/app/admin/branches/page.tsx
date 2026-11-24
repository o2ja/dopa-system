import type { Metadata } from "next";
import { Suspense } from "react";
import { BranchEditor } from "@/components/admin/branch-editor";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Branches & printers" };

const when = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Amman" });

async function Branches() {
  const branches = await db.branch.findMany({
    orderBy: { createdAt: "asc" },
    include: { printJobs: { orderBy: { createdAt: "desc" }, take: 8, include: { order: { select: { number: true } } } } },
  });
  return (
    <div className="space-y-12">
      {branches.map(({ printJobs, createdAt, ...b }) => {
        void createdAt;
        return (
          <BranchEditor
            key={b.id}
            branch={b}
            jobs={printJobs.map((j) => ({
              id: j.id,
              station: j.station,
              jobType: j.jobType,
              status: j.status,
              attempts: j.attempts,
              errorMessage: j.errorMessage,
              orderNumber: j.order?.number ?? null,
              at: when.format(j.createdAt),
            }))}
          />
        );
      })}
    </div>
  );
}

export default function BranchesPage() {
  return (
    <>
      <PageHeader title="Branches & printers" sub="Branch details, CliQ account and the Deloo printer addresses the print bridge reads." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Branches />
      </Suspense>
    </>
  );
}
