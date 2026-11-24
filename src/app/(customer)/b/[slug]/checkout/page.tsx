import { notFound } from "next/navigation";
import { TopBar } from "@/components/customer/Brand";
import { Checkout } from "@/components/customer/Checkout";
import { getMenu } from "@/components/customer/data";
import type { ItemDTO } from "@/components/customer/types";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params, searchParams }: PageProps<"/b/[slug]/checkout">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getMenu(slug);
  if (!data) notFound();

  const raw = Number(Array.isArray(sp.table) ? sp.table[0] : sp.table);
  const table = Number.isInteger(raw) && raw >= 1 && raw <= data.branch.tableCount ? raw : null;
  const items: Record<string, ItemDTO> = Object.fromEntries(data.categories.flatMap((c) => c.items).map((i) => [i.id, i]));

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-20 md:px-8">
        <Checkout branch={data.branch} table={table} items={items} />
      </main>
    </>
  );
}
