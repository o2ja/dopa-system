import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, int, oneOf, readBody, str } from "../_util";

export const POST = guard(async (req: Request) => {
  const b = await readBody(req);
  const category = await db.category.create({
    data: {
      name: str(b, "name", "Name")!,
      kind: oneOf(b, "kind", "Kind", ["coffee", "restaurant"])!,
      sortOrder: int(b, "sortOrder", "Sort order", { optional: true, max: 9999 }) ?? 0,
    },
  });
  return NextResponse.json({ category }, { status: 201 });
});
