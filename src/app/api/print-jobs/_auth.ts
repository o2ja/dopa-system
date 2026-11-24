import { timingSafeEqual } from "node:crypto";

/** Bridge auth: shared secret in `x-bridge-secret`. Unset env = always rejected. */
export function bridgeAuthorized(req: Request) {
  const secret = process.env.BRIDGE_SECRET;
  const given = req.headers.get("x-bridge-secret");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
