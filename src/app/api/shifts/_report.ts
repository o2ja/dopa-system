import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";

/** Z-Report: closed shifts return the stored numbers, open ones are computed live from paid orders. */
export async function shiftReport(id: string) {
  const shift = await db.shift.findUnique({ where: { id }, include: { branch: { select: { name: true } } } });
  if (!shift) throw new OrderError("Shift not found", 404);
  const { branch, ...s } = shift;

  const sales = s.status === "closed" ? { cash: s.cashSales, cliq: s.cliqSales, card: s.cardSales, orderCount: s.orderCount } : await liveTotals(id);
  return {
    shift: {
      ...s,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
      branchName: branch.name,
    },
    sales,
    expectedCash: s.expectedCash ?? s.openingFloat + sales.cash,
  };
}

export async function liveTotals(shiftId: string) {
  const rows = await db.order.groupBy({
    by: ["paymentMethod"],
    where: { shiftId, paymentStatus: "paid", status: { notIn: ["cancelled", "rejected"] } },
    _sum: { total: true },
    _count: true,
  });
  const sum = (m: string) => rows.find((r) => r.paymentMethod === m)?._sum.total ?? 0;
  return { cash: sum("cash"), cliq: sum("cliq"), card: sum("card"), orderCount: rows.reduce((n, r) => n + r._count, 0) };
}
