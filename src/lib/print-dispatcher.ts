import { db } from "@/lib/db";
import type { OrderItemModifier, PrintPayload, Station } from "@/types";

const TICKET_TITLE: Record<Station, string> = { coffee: "COFFEE TICKET", kitchen: "KITCHEN TICKET", pizza: "PIZZA TICKET" };

/**
 * Splits an order into print jobs: one prep ticket per station that has items
 * (coffee / kitchen / pizza) + one cashier receipt. A paid cash receipt also pulses the RJ11 drawer.
 * Skips if the order already has jobs, unless reprint=true (reprints never open the drawer).
 */
export async function dispatchPrintJobs(orderId: string, opts: { reprint?: boolean } = {}) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, branch: true, _count: { select: { printJobs: true } } },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status === "pending_verification" || order.status === "rejected") return [];
  if (order._count.printJobs > 0 && !opts.reprint) return [];

  const base = {
    branchName: order.branch.name,
    orderNumber: order.number,
    source: order.source as PrintPayload["source"],
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    pickupTime: order.pickupTime?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    notes: order.notes,
    reprint: !!opts.reprint,
  };
  const toLine = (i: (typeof order.items)[number]) => ({
    name: i.name,
    variant: i.variantName,
    modifiers: (JSON.parse(i.modifiers) as OrderItemModifier[]).map((m) => m.name),
    quantity: i.quantity,
    notes: i.notes,
    lineTotal: i.lineTotal,
  });

  const jobs: { station: string; jobType: string; payload: PrintPayload; openCashDrawer: boolean }[] = [];
  for (const station of ["coffee", "kitchen", "pizza"] as Station[]) {
    const items = order.items.filter((i) => i.station === station);
    if (items.length)
      jobs.push({ station, jobType: "ticket", openCashDrawer: false, payload: { ...base, title: TICKET_TITLE[station], items: items.map(toLine) } });
  }
  jobs.push({
    station: "cashier",
    jobType: "receipt",
    openCashDrawer: !opts.reprint && order.paymentMethod === "cash" && order.paymentStatus === "paid",
    payload: {
      ...base,
      title: "CUSTOMER RECEIPT",
      paymentMethod: order.paymentMethod as PrintPayload["paymentMethod"],
      items: order.items.map(toLine),
      subtotal: order.subtotal,
      total: order.total,
    },
  });

  return db.$transaction(
    jobs.map((j) =>
      db.printJob.create({
        data: { branchId: order.branchId, orderId, station: j.station, jobType: j.jobType, openCashDrawer: j.openCashDrawer, payload: JSON.stringify(j.payload) },
      }),
    ),
  );
}

/** Manual "Open cash drawer": drawer pulse only, on the cashier printer. */
export function openCashDrawer(branchId: string) {
  const payload: PrintPayload = { title: "OPEN DRAWER", branchName: "", createdAt: new Date().toISOString(), items: [] };
  return db.printJob.create({
    data: { branchId, station: "cashier", jobType: "open_drawer", openCashDrawer: true, payload: JSON.stringify(payload) },
  });
}
