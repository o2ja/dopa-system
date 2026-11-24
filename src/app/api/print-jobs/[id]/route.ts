import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bridgeAuthorized, unauthorized } from "../_auth";

const MAX_ATTEMPTS = 3;

export async function PATCH(req: Request, ctx: RouteContext<"/api/print-jobs/[id]">) {
  if (!bridgeAuthorized(req)) return unauthorized();
  const { id } = await ctx.params;
  const body: { status?: unknown; errorMessage?: unknown } | null = await req.json().catch(() => null);
  if (body?.status !== "printed" && body?.status !== "failed")
    return NextResponse.json({ error: "status must be printed or failed" }, { status: 400 });

  const job = await db.printJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const attempts = job.attempts + 1;
  const updated = await db.printJob.update({
    where: { id },
    data:
      body.status === "printed"
        ? { status: "printed", printedAt: new Date(), attempts, errorMessage: null }
        : {
            // below the attempt cap a failed job goes back to the queue
            status: attempts < MAX_ATTEMPTS ? "pending" : "failed",
            attempts,
            errorMessage: typeof body.errorMessage === "string" ? body.errorMessage.slice(0, 300) : "unknown error",
          },
  });
  return NextResponse.json({ job: { id: updated.id, status: updated.status, attempts: updated.attempts } });
}
