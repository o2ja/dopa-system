import { connection } from "next/server";
import { db } from "@/lib/db";

const DAY = 86_400_000;
const AMMAN_OFFSET = 3 * 3_600_000; // Jordan is UTC+3 year-round

export type Range = "today" | "7d";

/** Start (UTC instant) of the Amman calendar day that contains `t`. */
const dayStart = (t: number) => Math.floor((t + AMMAN_OFFSET) / DAY) * DAY - AMMAN_OFFSET;
const ammanHour = (t: Date) => new Date(t.getTime() + AMMAN_OFFSET).getUTCHours();

const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
export const ammanClock = (d = new Date()) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Amman" }).format(d);

export async function getAnalytics(range: Range) {
  await connection(); // per-request: depends on the current time
  const todayStart = dayStart(Date.now());
  const weekStart = todayStart - 6 * DAY;
  const rangeStart = range === "today" ? todayStart : weekStart;

  const [branches, orders, items, pendingCliq, failedJobs] = await Promise.all([
    db.branch.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    db.order.findMany({
      where: { createdAt: { gte: new Date(weekStart) } },
      select: { branchId: true, createdAt: true, total: true, paymentMethod: true, paymentStatus: true, source: true, status: true },
    }),
    db.orderItem.findMany({
      where: { order: { paymentStatus: "paid", createdAt: { gte: new Date(rangeStart) } } },
      select: { name: true, quantity: true, lineTotal: true },
    }),
    db.order.count({ where: { status: "pending_verification" } }),
    db.printJob.count({ where: { status: "failed" } }),
  ]);

  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const live = orders.filter((o) => o.status !== "rejected" && o.status !== "cancelled" && o.status !== "pending_verification");

  const days = Array.from({ length: 7 }, (_, i) => {
    const start = weekStart + i * DAY;
    const perBranch: Record<string, number> = {};
    for (const o of paid) {
      const t = o.createdAt.getTime();
      if (t >= start && t < start + DAY) perBranch[o.branchId] = (perBranch[o.branchId] ?? 0) + o.total;
    }
    return { label: dayLabel.format(new Date(start + AMMAN_OFFSET)), perBranch };
  });

  const ledger = branches.map((b) => {
    const mine = paid.filter((o) => o.branchId === b.id);
    const today = mine.filter((o) => o.createdAt.getTime() >= todayStart);
    const sum = (xs: typeof mine) => xs.reduce((s, o) => s + o.total, 0);
    return { ...b, today: sum(today), week: sum(mine), ordersToday: today.length, ordersWeek: mine.length };
  });

  const inRange = (o: { createdAt: Date }) => o.createdAt.getTime() >= rangeStart;
  const payments = { cash: 0, cliq: 0, card: 0 };
  for (const o of paid.filter(inRange)) payments[o.paymentMethod as keyof typeof payments] += o.total;

  const sources = { pos: 0, qr: 0, pickup: 0 };
  for (const o of live.filter(inRange)) sources[o.source as keyof typeof sources]++;

  const byName = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const i of items) {
    const row = byName.get(i.name) ?? { name: i.name, qty: 0, revenue: 0 };
    row.qty += i.quantity;
    row.revenue += i.lineTotal;
    byName.set(i.name, row);
  }
  const top = [...byName.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8);

  const hourly = Array<number>(24).fill(0);
  for (const o of live) if (o.createdAt.getTime() >= todayStart) hourly[ammanHour(o.createdAt)]++;

  return { branches, days, ledger, payments, sources, top, hourly, pendingCliq, failedJobs };
}
