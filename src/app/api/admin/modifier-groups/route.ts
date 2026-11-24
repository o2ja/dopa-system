import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, readBody } from "../_util";
import { parseGroup } from "./_group";

export const POST = guard(async (req: Request) => {
  const { modifiers, ...g } = parseGroup(await readBody(req));
  const group = await db.modifierGroup.create({ data: { ...g, modifiers: { create: modifiers } }, include: { modifiers: true } });
  return NextResponse.json({ group }, { status: 201 });
});
