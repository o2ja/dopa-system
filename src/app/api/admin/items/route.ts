import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, readBody } from "../_util";
import { parseItem } from "./_item";

export const POST = guard(async (req: Request) => {
  const { data, variants, groupIds } = await parseItem(await readBody(req), false);
  const item = await db.menuItem.create({
    data: {
      categoryId: data.categoryId!,
      name: data.name!,
      description: data.description,
      image: data.image,
      basePrice: data.basePrice!,
      station: data.station!,
      isActive: data.isActive ?? true,
      isPopular: data.isPopular ?? false,
      variants: variants?.length ? { create: variants } : undefined,
      modifierGroups: groupIds?.length ? { connect: groupIds.map((id) => ({ id })) } : undefined,
    },
    include: { variants: true, modifierGroups: { select: { id: true } } },
  });
  return NextResponse.json({ item }, { status: 201 });
});
