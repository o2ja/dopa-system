import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PrintPayload } from "@/types";
import { guard, Invalid, oneOf, readBody } from "../../../_util";

export const POST = guard(async (req: Request, ctx: RouteContext<"/api/admin/branches/[id]/test-print">) => {
  const { id } = await ctx.params;
  const station = oneOf(await readBody(req), "station", "Station", ["coffee", "kitchen", "pizza", "cashier"])!;
  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) throw new Invalid("Branch not found", 404);

  const payload: PrintPayload = {
    title: "TEST PRINT",
    branchName: branch.name,
    orderNumber: 0,
    source: "pos",
    createdAt: new Date().toISOString(),
    items: [
      { name: "Latte", variant: "Medium", modifiers: ["Oat milk"], quantity: 2, notes: "No sugar", lineTotal: 5500 },
      { name: "Croissant", modifiers: [], quantity: 1, lineTotal: 1750 },
    ],
  };
  const job = await db.printJob.create({
    data: { branchId: id, station, jobType: "ticket", payload: JSON.stringify(payload) },
  });
  return NextResponse.json({ job }, { status: 201 });
});
