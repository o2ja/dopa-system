import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bool, guard, int, ip, readBody, str } from "../../_util";

export const PATCH = guard(async (req: Request, ctx: RouteContext<"/api/admin/branches/[id]">) => {
  const { id } = await ctx.params;
  const b = await readBody(req);
  const branch = await db.branch.update({
    where: { id },
    data: {
      name: str(b, "name", "Name", { optional: true }),
      address: str(b, "address", "Address", { optional: true, allowEmpty: true }),
      phone: str(b, "phone", "Phone", { optional: true, allowEmpty: true, max: 30 }),
      hours: str(b, "hours", "Hours", { optional: true, allowEmpty: true, max: 60 }),
      isOpen: bool(b, "isOpen", { optional: true }),
      cliqAlias: str(b, "cliqAlias", "CliQ alias", { optional: true, max: 60 }),
      cliqName: str(b, "cliqName", "CliQ account name", { optional: true, allowEmpty: true, max: 80 }),
      coffeePrinterIp: ip(b, "coffeePrinterIp", "Coffee printer IP", { optional: true }),
      kitchenPrinterIp: ip(b, "kitchenPrinterIp", "Kitchen printer IP", { optional: true }),
      cashierPrinterIp: ip(b, "cashierPrinterIp", "Cashier printer IP", { optional: true }),
      tableCount: int(b, "tableCount", "Table count", { optional: true, max: 200 }),
    },
  });
  return NextResponse.json({ branch });
});
