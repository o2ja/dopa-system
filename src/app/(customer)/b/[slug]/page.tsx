import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getMenu } from "@/components/customer/data";
import { Menu } from "@/components/customer/Menu";

type Props = PageProps<"/b/[slug]">;

// Static shell renders instantly on navigation; the menu (live 86 availability, uncached) streams in.
export default function BranchMenuPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <BranchMenu params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BranchMenu({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getMenu(slug);
  if (!data) notFound();

  const raw = Number(Array.isArray(sp.table) ? sp.table[0] : sp.table);
  const table = Number.isInteger(raw) && raw >= 1 && raw <= data.branch.tableCount ? raw : null;

  return <Menu branch={data.branch} categories={data.categories} table={table} />;
}

function MenuSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8" aria-busy aria-label="Loading menu">
      <div className="h-9 w-48 rounded-md bg-paper-2" />
      <div className="mt-8 flex gap-6 border-b border-line pb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-4 w-16 rounded bg-paper-2" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 rounded-card border border-line bg-paper motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}
