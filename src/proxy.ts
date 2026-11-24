import { NextResponse, type NextRequest } from "next/server";

// Staff areas behind HTTP Basic auth (works on iPad Safari, remembered per device).
// shortcut: one shared STAFF_PASSWORD for all staff; upgrade to per-user PINs + roles when needed.
export function proxy(req: NextRequest) {
  const pass = process.env.STAFF_PASSWORD;
  if (!pass) return NextResponse.next(); // unset = open (local dev only)
  let given = "";
  try {
    given = atob((req.headers.get("authorization") ?? "").replace(/^Basic /, "")).split(":").slice(1).join(":");
  } catch {}
  if (given === pass) return NextResponse.next();
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dopa Staff"' },
  });
}

export const config = {
  matcher: ["/pos/:path*", "/admin/:path*", "/api/pos/:path*", "/api/admin/:path*", "/api/shifts/:path*"],
};
