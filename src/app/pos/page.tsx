import { db } from "@/lib/db";
import BranchPicker from "@/components/pos/BranchPicker";
import PosApp from "@/components/pos/PosApp";

export default async function PosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const slug = typeof sp.branch === "string" ? sp.branch : undefined;
  const branches = await db.branch.findMany({ orderBy: { createdAt: "asc" } });

  const branch = branches.find((b) => b.slug === slug);
  if (branch) {
    return (
      <PosApp
        branch={{ id: branch.id, slug: branch.slug, name: branch.name, cliqAlias: branch.cliqAlias, cliqName: branch.cliqName, tableCount: branch.tableCount }}
      />
    );
  }
  return <BranchPicker auto={!sp.change} branches={branches.map((b) => ({ slug: b.slug, name: b.name, address: b.address }))} />;
}
