import { NextResponse } from "next/server";
import { verifyOrder } from "@/lib/orders";
import { bad, handle, readJson } from "../../../_lib";

export function POST(req: Request, ctx: RouteContext<"/api/pos/orders/[id]/verify">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const b = await readJson(req);
    if (typeof b.approve !== "boolean") return bad("Decision is required");
    const reason = typeof b.reason === "string" ? b.reason.trim() : "";
    if (!b.approve && !reason) return bad("A rejection reason is required");
    const order = await verifyOrder(id, b.approve, reason);
    return NextResponse.json({ id: order.id, status: order.status });
  });
}
