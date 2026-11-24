import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const MAX_BYTES = 6 * 1024 * 1024;

/** multipart field "file" (CliQ receipt or menu image) -> { url } served by /api/upload/[file]. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return Response.json({ error: "يُسمح بالصور فقط (JPG, PNG, WEBP, HEIC)" }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "حجم الصورة يتجاوز 6MB" }, { status: 413 });

  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/api/upload/${name}` });
}
