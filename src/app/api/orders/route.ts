import { createOrder, OrderError } from "@/lib/orders";
import type { CartLineInput, CreateOrderInput } from "@/types";

const PHONE = /^07[789]\d{7}$/;
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parseLines(raw: unknown): CartLineInput[] | null {
  if (!Array.isArray(raw)) return null;
  const lines: CartLineInput[] = [];
  for (const l of raw) {
    if (!l || typeof l !== "object" || typeof l.menuItemId !== "string") return null;
    if (!Number.isInteger(l.quantity)) return null;
    if (l.modifierIds !== undefined && !(Array.isArray(l.modifierIds) && l.modifierIds.every((m: unknown) => typeof m === "string"))) return null;
    lines.push({
      menuItemId: l.menuItemId,
      variantId: typeof l.variantId === "string" ? l.variantId : null,
      modifierIds: l.modifierIds ?? [],
      quantity: l.quantity,
      notes: str(l.notes, 200),
    });
  }
  return lines;
}

/** Public customer orders only: source is qr (table) or pickup. POS orders go through /api/pos. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid request");

  const items = parseLines(body.items);
  if (!items) return bad("Invalid cart data");
  if (typeof body.branchId !== "string") return bad("Branch is required");
  if (body.source !== "qr" && body.source !== "pickup") return bad("Invalid order source");
  if (body.paymentMethod !== "cash" && body.paymentMethod !== "cliq") return bad("Invalid payment method");

  const input: CreateOrderInput = {
    branchId: body.branchId,
    source: body.source,
    paymentMethod: body.paymentMethod,
    items,
    notes: str(body.notes, 300),
    receiptUrl: typeof body.receiptUrl === "string" ? body.receiptUrl : null,
  };

  if (body.source === "qr") {
    input.tableNumber = Number(body.tableNumber);
  } else {
    const name = str(body.customerName, 80);
    const phone = str(body.customerPhone, 20);
    const pickup = typeof body.pickupTime === "string" ? new Date(body.pickupTime) : null;
    if (!name) return bad("Name is required");
    if (!PHONE.test(phone)) return bad("Invalid phone number (07XXXXXXXX)");
    if (!pickup || Number.isNaN(+pickup) || +pickup < Date.now() - 60_000 || +pickup > Date.now() + 24 * 3600_000)
      return bad("Invalid pickup time");
    Object.assign(input, { customerName: name, customerPhone: phone, pickupTime: pickup.toISOString() });
  }

  try {
    const order = await createOrder(input);
    return Response.json({ id: order.id }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return bad(e.message, e.status);
    console.error(e);
    return bad("Couldn't create the order, please try again", 500);
  }
}
