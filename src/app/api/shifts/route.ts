import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";
import { bad, handle, readJson, requireBranch } from "../pos/_lib";

const asShift = (s: { openedAt: Date; closedAt: Date | null }) => ({ ...s, openedAt: s.openedAt.toISOString(), closedAt: s.closedAt?.toISOString() ?? null });

/** Current open shift for a branch, or `{ shift: null }`. */
export function GET(req: Request) {
  return handle(async () => {
    const branch = await requireBranch(new URL(req.url).searchParams.get("branchId"));
    const shift = await db.shift.findFirst({ where: { branchId: branch.id, status: "open" }, orderBy: { openedAt: "desc" } });
    return NextResponse.json({ shift: shift && asShift(shift) });
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    const branch = await requireBranch(b.branchId);
    const cashierName = typeof b.cashierName === "string" ? b.cashierName.trim().slice(0, 60) : "";
    if (!cashierName) return bad("Cashier name is required");
    const openingFloat = Number(b.openingFloat);
    if (!Number.isInteger(openingFloat) || openingFloat < 0 || openingFloat > 100_000_000) return bad("Invalid opening float");
    if (await db.shift.findFirst({ where: { branchId: branch.id, status: "open" } })) throw new OrderError("A shift is already open", 409);

    const shift = await db.shift.create({ data: { branchId: branch.id, cashierName, openingFloat } });
    return NextResponse.json({ shift: asShift(shift) }, { status: 201 });
  });
}
