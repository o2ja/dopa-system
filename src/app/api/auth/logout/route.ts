import { NextResponse } from "next/server";
import { isHttps, STAFF_COOKIE } from "../_token";

export function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: isHttps(req), path: "/", maxAge: 0 });
  return res;
}
