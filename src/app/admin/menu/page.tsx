import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuManager } from "@/components/admin/menu-manager";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Menu" };

async function Menu() {
  const [categories, items, groups] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { items: true } } } }),
    db.menuItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { variants: { orderBy: { sortOrder: "asc" } }, modifierGroups: { select: { id: true } } },
    }),
    db.modifierGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { modifiers: { orderBy: { id: "asc" } }, _count: { select: { items: true } } },
    }),
  ]);
  return (
    <MenuManager
      categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, sortOrder: c.sortOrder, itemCount: c._count.items }))}
      items={items.map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        name: i.name,
        description: i.description,
        image: i.image,
        basePrice: i.basePrice,
        station: i.station,
        isActive: i.isActive,
        isPopular: i.isPopular,
        variants: i.variants.map((v) => ({ name: v.name, price: v.price, isDefault: v.isDefault })),
        groupIds: i.modifierGroups.map((g) => g.id),
      }))}
      groups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        itemCount: g._count.items,
        modifiers: g.modifiers.map((m) => ({ name: m.name, price: m.price })),
      }))}
    />
  );
}

export default function MenuPage() {
  return (
    <>
      <PageHeader title="Menu" sub="Categories, items, variants and modifiers. Changes go live on the ordering pages immediately." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Menu />
      </Suspense>
    </>
  );
}
