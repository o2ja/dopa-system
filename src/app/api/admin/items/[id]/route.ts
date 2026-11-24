import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, Invalid, readBody } from "../../_util";
import { parseItem } from "../_item";

export const PATCH = guard(async (req: Request, ctx: RouteContext<"/api/admin/items/[id]">) => {
  const { id } = await ctx.params;
  const { data, variants, groupIds } = await parseItem(await readBody(req), true);
  const item = await db.$transaction(async (tx) => {
    if (variants) {
      await tx.variant.deleteMany({ where: { itemId: id } });
      await tx.variant.createMany({ data: variants.map((v) => ({ ...v, itemId: id })) });
    }
    return tx.menuItem.update({
      where: { id },
      data: { ...data, modifierGroups: groupIds ? { set: groupIds.map((g) => ({ id: g })) } : undefined },
      include: { variants: true, modifierGroups: { select: { id: true } } },
    });
  });
  return NextResponse.json({ item });
});

export const DELETE = guard(async (_req: Request, ctx: RouteContext<"/api/admin/items/[id]">) => {
  const { id } = await ctx.params;
  if (await db.orderItem.count({ where: { menuItemId: id } }))
    throw new Invalid("This item is used in past orders and cannot be deleted. Deactivate it instead.", 409);
  await db.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
