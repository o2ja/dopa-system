import { getCustomerOrder } from "@/components/customer/data";

export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const order = await getCustomerOrder(id);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  return Response.json(order, { headers: { "Cache-Control": "no-store" } });
}
