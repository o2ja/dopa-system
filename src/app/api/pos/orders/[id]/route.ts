import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";
import { openCashDrawer } from "@/lib/print-dispatcher";
import { bad, handle, readJson, toOrderDTO } from "../../_lib";

const FLOW = ["received", "preparing", "ready", "completed"];

/** Body: `{ status }` advances the order; `{ markPaid: "cash" | "card" }` collects an unpaid QR order. */
export function PATCH(req: Request, ctx: RouteContext<"/api/pos/orders/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const b = await readJson(req);
    const order = await db.order.findUnique({ where: { id } });
    if (!order) throw new OrderError("Order not found", 404);

    if (b.markPaid !== undefined) {
      if (b.markPaid !== "cash" && b.markPaid !== "card") return bad("Invalid payment method");
      if (order.paymentStatus !== "unpaid") throw new OrderError("Order is already paid", 409);
      // Money lands in the drawer of the shift that is open now, not the one the order was created in.
      const shift = await db.shift.findFirst({ where: { branchId: order.branchId, status: "open" } });
      const updated = await db.order.update({
        where: { id },
        data: { paymentMethod: b.markPaid, paymentStatus: "paid", shiftId: shift?.id ?? order.shiftId },
        include: { items: true },
      });
      if (b.markPaid === "cash") await openCashDrawer(order.branchId);
      return NextResponse.json(toOrderDTO(updated));
    }

    const next = String(b.status);
    const cur = FLOW.indexOf(order.status);
    if (cur < 0) throw new OrderError("This order's status can't be changed", 409);
    if (next === "cancelled") {
      if (order.status === "completed") throw new OrderError("Order is already completed", 409);
    } else {
      if (FLOW.indexOf(next) <= cur) return bad("Invalid status");
      if (next === "completed" && order.paymentStatus !== "paid") throw new OrderError("Collect payment first", 409);
    }
    const updated = await db.order.update({ where: { id }, data: { status: next }, include: { items: true } });
    return NextResponse.json(toOrderDTO(updated));
  });
}
