import { NextResponse, type NextRequest } from "next/server";
import { safeEqual, staffToken, STAFF_COOKIE } from "@/app/api/auth/_token";

// Staff areas behind a shared-password login (cookie set by /api/auth/login).
// shortcut: one shared STAFF_PASSWORD for all staff; upgrade to per-user PINs + roles when needed.
export async function proxy(req: NextRequest) {
  const pass = process.env.STAFF_PASSWORD;
  if (!pass) return NextResponse.next(); // unset = open (local dev only)
  const given = req.cookies.get(STAFF_COOKIE)?.value ?? "";
  if (safeEqual(given, await staffToken(pass))) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/pos/:path*", "/admin/:path*", "/api/pos/:path*", "/api/admin/:path*", "/api/shifts/:path*"],
};
