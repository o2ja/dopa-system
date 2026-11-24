import { readFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

// `next start` only serves files that were in public/ at build time, so runtime uploads are served here.
export async function GET(_req: Request, ctx: RouteContext<"/api/upload/[file]">) {
  const { file } = await ctx.params;
  if (!/^[\w-]+\.(jpg|png|webp|heic)$/.test(file)) return new Response("Not found", { status: 404 });
  const data = await readFile(path.join(process.cwd(), "public", "uploads", file)).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: { "Content-Type": TYPES[file.split(".").pop()!], "Cache-Control": "private, max-age=86400" },
  });
}
