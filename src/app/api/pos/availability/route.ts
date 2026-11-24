import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";
import { bad, handle, readJson, requireBranch } from "../_lib";

export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const branch = await requireBranch(b.branchId);
    if (typeof b.itemId !== "string" || typeof b.isAvailable !== "boolean") return bad("Invalid request");
    if (!(await db.menuItem.findUnique({ where: { id: b.itemId }, select: { id: true } }))) throw new OrderError("Item not found", 404);
    await db.branchItemAvailability.upsert({
      where: { branchId_itemId: { branchId: branch.id, itemId: b.itemId } },
      create: { branchId: branch.id, itemId: b.itemId, isAvailable: b.isAvailable },
      update: { isAvailable: b.isAvailable },
    });
    return NextResponse.json({ ok: true });
  });
}
