import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, requireBranch } from "../_lib";

export function GET(req: Request) {
  return handle(async () => {
    const branch = await requireBranch(new URL(req.url).searchParams.get("branchId"));
    const [categories, off] = await Promise.all([
      db.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              variants: { orderBy: { sortOrder: "asc" } },
              modifierGroups: { orderBy: { sortOrder: "asc" }, include: { modifiers: true } },
            },
          },
        },
      }),
      db.branchItemAvailability.findMany({ where: { branchId: branch.id, isAvailable: false }, select: { itemId: true } }),
    ]);
    return NextResponse.json({ categories: categories.filter((c) => c.items.length), unavailable: off.map((o) => o.itemId) });
  });
}
