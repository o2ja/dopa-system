import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard } from "../../../_util";

export const POST = guard(async (_req: Request, ctx: RouteContext<"/api/admin/print-jobs/[id]/retry">) => {
  const { id } = await ctx.params;
  const job = await db.printJob.update({ where: { id }, data: { status: "pending", attempts: 0, errorMessage: null } });
  return NextResponse.json({ job });
});
