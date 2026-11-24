import { NextResponse } from "next/server";
import { isHttps, safeEqual, staffToken, STAFF_COOKIE, STAFF_COOKIE_MAX_AGE } from "../_token";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null);

export async function POST(req: Request) {
  const pass = process.env.STAFF_PASSWORD;
  const isJson = (req.headers.get("content-type") ?? "").includes("application/json");
  let password = "";
  let next: string | null = null;
  try {
    const data: Record<string, unknown> = isJson ? await req.json() : Object.fromEntries(await req.formData());
    password = typeof data.password === "string" ? data.password : "";
    next = safeNext(data.next);
  } catch {}

  // Gate open (no password configured): nothing to authenticate.
  if (!pass) return next && !isJson ? NextResponse.redirect(new URL(next, req.url), 303) : NextResponse.json({ ok: true });

  const expected = await staffToken(pass);
  if (!safeEqual(await staffToken(password), expected)) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = next && !isJson ? NextResponse.redirect(new URL(next, req.url), 303) : NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: STAFF_COOKIE_MAX_AGE,
  });
  return res;
}
