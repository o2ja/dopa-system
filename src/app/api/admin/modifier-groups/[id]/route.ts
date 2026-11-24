import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, readBody } from "../../_util";
import { parseGroup } from "../_group";

export const PATCH = guard(async (req: Request, ctx: RouteContext<"/api/admin/modifier-groups/[id]">) => {
  const { id } = await ctx.params;
  const { modifiers, ...g } = parseGroup(await readBody(req));
  const group = await db.$transaction(async (tx) => {
    await tx.modifier.deleteMany({ where: { groupId: id } });
    return tx.modifierGroup.update({ where: { id }, data: { ...g, modifiers: { create: modifiers } }, include: { modifiers: true } });
  });
  return NextResponse.json({ group });
});

export const DELETE = guard(async (_req: Request, ctx: RouteContext<"/api/admin/modifier-groups/[id]">) => {
  const { id } = await ctx.params;
  await db.modifierGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
