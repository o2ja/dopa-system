import { NextResponse } from "next/server";
import { dispatchPrintJobs } from "@/lib/print-dispatcher";
import { handle } from "../../../_lib";

export function POST(_req: Request, ctx: RouteContext<"/api/pos/orders/[id]/reprint">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const jobs = await dispatchPrintJobs(id, { reprint: true });
    return NextResponse.json({ jobs: jobs.length });
  });
}
