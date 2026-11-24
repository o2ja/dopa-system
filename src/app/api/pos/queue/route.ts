import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, requireBranch, startOfToday, toOrderDTO } from "../_lib";

// Polled every 3s: live orders, the rush counter and the Quick 86 list (so every tablet stays in sync).
export function GET(req: Request) {
  return handle(async () => {
    const branch = await requireBranch(new URL(req.url).searchParams.get("branchId"));
    const [orders, rush, off] = await Promise.all([
      db.order.findMany({
        where: {
          branchId: branch.id,
          status: { in: ["pending_verification", "received", "preparing", "ready"] },
          OR: [{ source: { not: "pos" } }, { createdAt: { gte: startOfToday() } }],
        },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      }),
      db.order.count({
        where: { branchId: branch.id, status: { notIn: ["rejected", "cancelled"] }, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
      }),
      db.branchItemAvailability.findMany({ where: { branchId: branch.id, isAvailable: false }, select: { itemId: true } }),
    ]);
    return NextResponse.json({ orders: orders.map(toOrderDTO), rush, unavailable: off.map((o) => o.itemId) });
  });
}
