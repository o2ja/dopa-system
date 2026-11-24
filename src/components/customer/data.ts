import { db } from "@/lib/db";
import type { OrderStatus, OrderSource, PaymentMethod } from "@/types";
import type { BranchDTO, CategoryDTO, ItemDTO, OrderDTO } from "./types";

const branchDTO = (b: BranchDTO): BranchDTO => ({
  id: b.id,
  slug: b.slug,
  name: b.name,
  address: b.address,
  phone: b.phone,
  hours: b.hours,
  isOpen: b.isOpen,
  cliqAlias: b.cliqAlias,
  cliqName: b.cliqName,
  tableCount: b.tableCount,
});

export async function getBranches() {
  const rows = await db.branch.findMany({ orderBy: { slug: "asc" } });
  return rows.map(branchDTO);
}

const itemInclude = {
  variants: { orderBy: { sortOrder: "asc" } },
  modifierGroups: { orderBy: { sortOrder: "asc" }, include: { modifiers: true } },
} as const;

const itemDTO = (
  m: {
    id: string; name: string; description: string; basePrice: number; isPopular: boolean;
    variants: ItemDTO["variants"];
    modifierGroups: ItemDTO["groups"];
  },
  available: boolean,
): ItemDTO => ({
  id: m.id,
  name: m.name,
  description: m.description,
  basePrice: m.basePrice,
  isPopular: m.isPopular,
  available,
  variants: m.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, isDefault: v.isDefault })),
  groups: m.modifierGroups.map((g) => ({
    id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect,
    modifiers: g.modifiers.map((x) => ({ id: x.id, name: x.name, price: x.price })),
  })),
});

export async function getMenu(slug: string) {
  const branch = await db.branch.findUnique({
    where: { slug },
    include: { availability: { where: { isAvailable: false } } },
  });
  if (!branch) return null;
  const soldOut = new Set(branch.availability.map((a) => a.itemId));
  const cats = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: itemInclude } },
  });
  const categories: CategoryDTO[] = cats
    .filter((c) => c.items.length)
    .map((c) => ({ id: c.id, name: c.name, items: c.items.map((m) => itemDTO(m, !soldOut.has(m.id))) }));
  return { branch: branchDTO(branch), categories };
}

export async function getPopularItems() {
  const rows = await db.menuItem.findMany({
    where: { isActive: true, isPopular: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
    include: itemInclude,
  });
  return rows.map((m) => itemDTO(m, true));
}

/** Customer-safe projection: no phone, name, receipt or internal ids beyond the order id itself. */
export async function getCustomerOrder(id: string): Promise<OrderDTO | null> {
  const o = await db.order.findUnique({ where: { id }, include: { items: true, branch: true } });
  if (!o) return null;
  return {
    id: o.id,
    number: o.number,
    status: o.status as OrderStatus,
    source: o.source as OrderSource,
    paymentMethod: o.paymentMethod as PaymentMethod,
    tableNumber: o.tableNumber,
    pickupTime: o.pickupTime?.toISOString() ?? null,
    rejectReason: o.rejectReason,
    total: o.total,
    branch: { name: o.branch.name, phone: o.branch.phone, slug: o.branch.slug },
    items: o.items.map((i) => ({
      name: i.name,
      variantName: i.variantName,
      modifiers: (JSON.parse(i.modifiers || "[]") as { name: string }[]).map((m) => m.name),
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      notes: i.notes,
    })),
  };
}
