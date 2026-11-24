import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { IPV4 } from "@/components/admin/validate";

export class Invalid extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type Body = Record<string, unknown>;

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function readBody(req: Request): Promise<Body> {
  const b: unknown = await req.json().catch(() => null);
  if (!b || typeof b !== "object" || Array.isArray(b)) throw new Invalid("Invalid request body");
  return b as Body;
}

/** Wraps a handler: validation errors -> 400, missing record -> 404, anything else -> 500. */
export function guard<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (e) {
      unstable_rethrow(e); // let Next's internal prerender/navigation signals through
      if (e instanceof Invalid) return fail(e.message, e.status);
      if ((e as { code?: string })?.code === "P2025") return fail("Not found", 404);
      console.error(e);
      return fail("Server error", 500);
    }
  };
}

type Opt = { optional?: boolean };

/** Trimmed string. optional=true: absent key -> undefined (partial updates). */
export function str(b: Body, k: string, label: string, o: Opt & { max?: number; allowEmpty?: boolean } = {}) {
  const v = b[k];
  if (v === undefined && o.optional) return undefined;
  if (typeof v !== "string") throw new Invalid(`${label} is required`);
  const t = v.trim();
  if (!t && !o.allowEmpty) throw new Invalid(`${label} is required`);
  if (t.length > (o.max ?? 200)) throw new Invalid(`${label} is too long`);
  return t;
}

export function int(b: Body, k: string, label: string, o: Opt & { min?: number; max?: number } = {}) {
  const v = b[k];
  if (v === undefined && o.optional) return undefined;
  if (typeof v !== "number" || !Number.isInteger(v)) throw new Invalid(`${label} must be a whole number`);
  if (v < (o.min ?? 0) || v > (o.max ?? 10_000_000)) throw new Invalid(`${label} is out of range`);
  return v;
}

export function bool(b: Body, k: string, o: Opt = {}) {
  const v = b[k];
  if (v === undefined && o.optional) return undefined;
  if (typeof v !== "boolean") throw new Invalid(`${k} must be true or false`);
  return v;
}

export function oneOf<T extends string>(b: Body, k: string, label: string, allowed: readonly T[], o: Opt = {}) {
  const v = b[k];
  if (v === undefined && o.optional) return undefined;
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new Invalid(`${label} is invalid`);
  return v as T;
}

export function list(b: Body, k: string, label: string, max = 100): Body[] {
  const v = b[k];
  if (!Array.isArray(v) || v.length > max) throw new Invalid(`${label} is invalid`);
  return v.map((x) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) throw new Invalid(`${label} contains an invalid entry`);
    return x as Body;
  });
}

export function ip(b: Body, k: string, label: string, o: Opt = {}) {
  const v = str(b, k, label, { ...o, allowEmpty: true, max: 15 });
  if (v && !IPV4.test(v)) throw new Invalid(`${label}: not a valid IPv4 address (e.g. 192.168.1.50)`);
  return v;
}
