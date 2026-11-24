import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = { title: "Live sales" };

async function Live({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { range } = await searchParams;
  return <Dashboard range={range === "7d" ? "7d" : "today"} />;
}

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <Live searchParams={props.searchParams} />
    </Suspense>
  );
}
