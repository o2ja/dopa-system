import { NextResponse } from "next/server";
import { handle } from "../../pos/_lib";
import { shiftReport } from "../_report";

export function GET(_req: Request, ctx: RouteContext<"/api/shifts/[id]">) {
  return handle(async () => NextResponse.json(await shiftReport((await ctx.params).id)));
}
