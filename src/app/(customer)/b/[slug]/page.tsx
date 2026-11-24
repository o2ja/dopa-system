import { notFound } from "next/navigation";
import { getMenu } from "@/components/customer/data";
import { Menu } from "@/components/customer/Menu";

export default async function BranchMenuPage({ params, searchParams }: PageProps<"/b/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getMenu(slug);
  if (!data) notFound();

  const raw = Number(Array.isArray(sp.table) ? sp.table[0] : sp.table);
  const table = Number.isInteger(raw) && raw >= 1 && raw <= data.branch.tableCount ? raw : null;

  return <Menu branch={data.branch} categories={data.categories} table={table} />;
}
