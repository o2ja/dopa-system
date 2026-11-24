import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bridgeAuthorized, unauthorized } from "../_auth";

export async function GET(req: Request) {
  if (!bridgeAuthorized(req)) return unauthorized();
  const key = new URL(req.url).searchParams.get("branchId");
  if (!key) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  const branch = await db.branch.findFirst({
    where: { OR: [{ id: key }, { slug: key }] },
    select: { id: true, slug: true, coffeePrinterIp: true, kitchenPrinterIp: true, cashierPrinterIp: true },
  });
  if (!branch) return NextResponse.json({ error: "branch not found" }, { status: 404 });

  const rows = await db.printJob.findMany({
    where: { branchId: branch.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const jobs = rows.map((j) => ({
    id: j.id,
    station: j.station,
    jobType: j.jobType,
    openCashDrawer: j.openCashDrawer,
    payload: JSON.parse(j.payload) as unknown,
    attempts: j.attempts,
    createdAt: j.createdAt,
  }));
  return NextResponse.json({ branch, jobs });
}
