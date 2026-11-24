import { NextResponse } from "next/server";
import { openCashDrawer } from "@/lib/print-dispatcher";
import { handle, readJson, requireBranch } from "../_lib";

export function POST(req: Request) {
  return handle(async () => {
    const branch = await requireBranch((await readJson(req)).branchId);
    await openCashDrawer(branch.id);
    return NextResponse.json({ ok: true });
  });
}
