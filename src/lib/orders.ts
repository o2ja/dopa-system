import { db } from "@/lib/db";
import { dispatchPrintJobs } from "@/lib/print-dispatcher";
import type { CreateOrderInput, OrderItemModifier, OrderStatus, PaymentStatus } from "@/types";

export class OrderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Single source of truth for creating orders (customer site, QR and POS).
 * Recomputes every price server-side, enforces Quick 86 and the CliQ anti-fake-order rule.
 * - pickup: must be CliQ + receipt -> pending_verification, never printed until the cashier approves.
 * - qr + cliq: same as pickup. qr + cash: printed right away, paid later at the counter.
 * - pos: paid on the spot, printed right away (cash opens the drawer).
 */
export async function createOrder(input: CreateOrderInput) {
  const { branchId, source, paymentMethod } = input;
  if (!["pos", "qr", "pickup"].includes(source)) throw new OrderError("مصدر طلب غير صالح");
  if (!["cash", "cliq", "card"].includes(paymentMethod)) throw new OrderError("طريقة دفع غير صالحة");
  if (!Array.isArray(input.items) || input.items.length === 0) throw new OrderError("السلة فارغة");
  if (input.items.length > 50) throw new OrderError("عدد الأصناف كبير جداً");
  if (source !== "pos" && paymentMethod === "card") throw new OrderError("الدفع بالبطاقة متاح في الكاشير فقط");
  if (source === "pickup" && paymentMethod !== "cliq") throw new OrderError("طلبات الاستلام تتطلب الدفع المسبق عبر CliQ");
  if (source !== "pos" && paymentMethod === "cliq" && !input.receiptUrl) throw new OrderError("يرجى رفع صورة إيصال CliQ");
  if (input.receiptUrl && !input.receiptUrl.startsWith("/api/upload/")) throw new OrderError("رابط إيصال غير صالح");

  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new OrderError("الفرع غير موجود", 404);
  if (source !== "pos" && !branch.isOpen) throw new OrderError("الفرع مغلق حالياً");

  const table = input.tableNumber ?? null;
  if (source === "qr" && (!Number.isInteger(table) || table! < 1 || table! > branch.tableCount))
    throw new OrderError("رقم الطاولة غير صالح");

  const itemIds = [...new Set(input.items.map((l) => l.menuItemId))];
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: itemIds } },
    include: {
      variants: true,
      modifierGroups: { include: { modifiers: true } },
      availability: { where: { branchId } },
    },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const lines = input.items.map((line) => {
    const item = byId.get(line.menuItemId);
    if (!item || !item.isActive) throw new OrderError("صنف غير متوفر");
    if (item.availability[0]?.isAvailable === false) throw new OrderError(`نفد: ${item.nameAr}`);
    const qty = line.quantity;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new OrderError("كمية غير صالحة");

    let unit = item.basePrice;
    let variant: (typeof item.variants)[number] | undefined;
    if (item.variants.length) {
      variant = line.variantId
        ? item.variants.find((v) => v.id === line.variantId)
        : item.variants.find((v) => v.isDefault) ?? item.variants[0];
      if (!variant) throw new OrderError(`حجم غير صالح: ${item.nameAr}`);
      unit = variant.price;
    }

    const mods: OrderItemModifier[] = [];
    const picked = new Set(line.modifierIds ?? []);
    for (const group of item.modifierGroups) {
      const chosen = group.modifiers.filter((m) => picked.has(m.id));
      if (chosen.length < group.minSelect || chosen.length > group.maxSelect)
        throw new OrderError(`اختيار غير صالح: ${group.nameAr}`);
      chosen.forEach((m) => {
        picked.delete(m.id);
        mods.push({ id: m.id, nameAr: m.nameAr, nameEn: m.nameEn, price: m.price });
        unit += m.price;
      });
    }
    if (picked.size) throw new OrderError("إضافة غير صالحة");

    return {
      menuItemId: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      variantId: variant?.id ?? null,
      variantAr: variant?.nameAr ?? null,
      modifiers: JSON.stringify(mods),
      station: item.station,
      quantity: qty,
      unitPrice: unit,
      lineTotal: unit * qty,
      notes: line.notes?.slice(0, 200) || null,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const needsVerification = source !== "pos" && paymentMethod === "cliq";
  const status: OrderStatus = needsVerification ? "pending_verification" : "received";
  const paymentStatus: PaymentStatus =
    source === "pos" ? "paid" : needsVerification ? "pending_verification" : "unpaid";

  let shiftId = input.shiftId ?? null;
  if (!shiftId) {
    const open = await db.shift.findFirst({ where: { branchId, status: "open" }, orderBy: { openedAt: "desc" } });
    shiftId = open?.id ?? null;
  }
  if (source === "pos" && !shiftId) throw new OrderError("افتح وردية أولاً");

  // shortcut: daily number = today's count + 1 inside a transaction; SQLite serializes writes so it's safe here.
  // On Postgres/MySQL with many concurrent tills, switch to a per-branch counter row with UPDATE ... RETURNING.
  const order = await db.$transaction(async (tx) => {
    const number = (await tx.order.count({ where: { branchId, createdAt: { gte: startOfToday() } } })) + 1;
    return tx.order.create({
      data: {
        number,
        branchId,
        shiftId,
        source,
        status,
        paymentMethod,
        paymentStatus,
        receiptUrl: input.receiptUrl ?? null,
        tableNumber: table,
        customerName: input.customerName?.slice(0, 80) || null,
        customerPhone: input.customerPhone?.slice(0, 20) || null,
        pickupTime: input.pickupTime ? new Date(input.pickupTime) : null,
        notes: input.notes?.slice(0, 300) || null,
        subtotal,
        total: subtotal,
        items: { create: lines },
      },
      include: { items: true },
    });
  });

  if (!needsVerification) await dispatchPrintJobs(order.id);
  return order;
}

/** Cashier approves/rejects a CliQ order. Approval marks it paid and sends it to the printers. */
export async function verifyOrder(orderId: string, approve: boolean, reason?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("الطلب غير موجود", 404);
  if (order.status !== "pending_verification") throw new OrderError("تمت معالجة هذا الطلب مسبقاً", 409);

  if (!approve) {
    return db.order.update({
      where: { id: orderId },
      data: { status: "rejected", paymentStatus: "rejected", rejectReason: reason?.slice(0, 200) || null },
    });
  }
  const open = await db.shift.findFirst({ where: { branchId: order.branchId, status: "open" } });
  const updated = await db.order.update({
    where: { id: orderId },
    data: { status: "received", paymentStatus: "paid", verifiedAt: new Date(), shiftId: order.shiftId ?? open?.id },
  });
  await dispatchPrintJobs(orderId);
  return updated;
}
