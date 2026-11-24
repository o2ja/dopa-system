import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { OrderError } from "@/lib/orders";
import type { OrderItemModifier } from "@/types";

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e); // let Next's internal prerender/navigation signals through
    if (e instanceof OrderError) return bad(e.message, e.status);
    console.error(e);
    return bad("Something went wrong", 500);
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body: unknown = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export async function requireBranch(branchId: unknown) {
  if (typeof branchId !== "string" || !branchId) throw new OrderError("Branch is required");
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new OrderError("Branch not found", 404);
  return branch;
}

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

type OrderRow = Prisma.OrderGetPayload<{ include: { items: true } }>;

/** Shape the POS client consumes: modifiers flattened to names, dates as ISO. */
export function toOrderDTO(o: OrderRow) {
  return {
    id: o.id,
    number: o.number,
    source: o.source,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    receiptUrl: o.receiptUrl,
    tableNumber: o.tableNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    pickupTime: o.pickupTime?.toISOString() ?? null,
    notes: o.notes,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      variantName: i.variantName,
      modifiers: (JSON.parse(i.modifiers) as OrderItemModifier[]).map((m) => m.name),
      quantity: i.quantity,
      notes: i.notes,
    })),
  };
}
