import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, int, Invalid, oneOf, readBody, str } from "../../_util";

export const PATCH = guard(async (req: Request, ctx: RouteContext<"/api/admin/categories/[id]">) => {
  const { id } = await ctx.params;
  const b = await readBody(req);
  const category = await db.category.update({
    where: { id },
    data: {
      name: str(b, "name", "Name", { optional: true }),
      kind: oneOf(b, "kind", "Kind", ["coffee", "restaurant"], { optional: true }),
      sortOrder: int(b, "sortOrder", "Sort order", { optional: true, max: 9999 }),
    },
  });
  return NextResponse.json({ category });
});

export const DELETE = guard(async (_req: Request, ctx: RouteContext<"/api/admin/categories/[id]">) => {
  const { id } = await ctx.params;
  // Deleting a category cascades to its items, which are protected by past orders.
  const used = await db.orderItem.count({ where: { menuItem: { categoryId: id } } });
  if (used) throw new Invalid("This category has items used in past orders. Deactivate those items instead of deleting.", 409);
  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
