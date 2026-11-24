import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";
import { bad, handle, readJson } from "../../../pos/_lib";
import { liveTotals, shiftReport } from "../../_report";

export function POST(req: Request, ctx: RouteContext<"/api/shifts/[id]/close">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const b = await readJson(req);
    const actualCash = Number(b.actualCash);
    if (!Number.isInteger(actualCash) || actualCash < 0 || actualCash > 1_000_000_000) return bad("Invalid counted cash amount");

    const shift = await db.shift.findUnique({ where: { id } });
    if (!shift) throw new OrderError("Shift not found", 404);
    if (shift.status !== "open") throw new OrderError("Shift is already closed", 409);

    const t = await liveTotals(id);
    const expectedCash = shift.openingFloat + t.cash;
    await db.shift.update({
      where: { id },
      data: {
        status: "closed",
        closedAt: new Date(),
        cashSales: t.cash,
        cliqSales: t.cliq,
        cardSales: t.card,
        orderCount: t.orderCount,
        expectedCash,
        actualCash,
        variance: actualCash - expectedCash,
        notes: typeof b.notes === "string" ? b.notes.trim().slice(0, 300) || null : null,
      },
    });
    return NextResponse.json(await shiftReport(id));
  });
}
