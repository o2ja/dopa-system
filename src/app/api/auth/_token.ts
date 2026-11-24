export const STAFF_COOKIE = "dopa_staff";
export const STAFF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Cookie value is a salted hash of the password, never the password itself.
// shortcut: fixed salt + one shared password; rotating STAFF_PASSWORD logs everyone out.
export async function staffToken(password: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${password}:dopa-staff-v1`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function isHttps(req: Request) {
  return req.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https" || new URL(req.url).protocol === "https:";
}
