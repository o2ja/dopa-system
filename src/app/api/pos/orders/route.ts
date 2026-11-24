import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import type { CartLineInput, PaymentMethod } from "@/types";
import { bad, handle, readJson } from "../_lib";

export function POST(req: Request) {
  return handle(async () => {
    const b = await readJson(req);
    if (typeof b.branchId !== "string") return bad("Branch is required");
    if (b.paymentMethod !== "cash" && b.paymentMethod !== "cliq" && b.paymentMethod !== "card") return bad("Invalid payment method");
    if (!Array.isArray(b.items)) return bad("The ticket is empty");

    const items: CartLineInput[] = b.items.map((l: Record<string, unknown>) => ({
      menuItemId: String(l?.menuItemId ?? ""),
      variantId: typeof l?.variantId === "string" ? l.variantId : null,
      modifierIds: Array.isArray(l?.modifierIds) ? l.modifierIds.map(String) : [],
      quantity: Number(l?.quantity),
      notes: typeof l?.notes === "string" ? l.notes : undefined,
    }));
    const table = b.tableNumber == null || b.tableNumber === "" ? null : Number(b.tableNumber);
    if (table !== null && (!Number.isInteger(table) || table < 1 || table > 999)) return bad("Invalid table number");

    const order = await createOrder({
      branchId: b.branchId,
      source: "pos",
      paymentMethod: b.paymentMethod as PaymentMethod,
      items,
      tableNumber: table,
      notes: typeof b.notes === "string" ? b.notes : undefined,
    });
    return NextResponse.json({ id: order.id, number: order.number, total: order.total }, { status: 201 });
  });
}
