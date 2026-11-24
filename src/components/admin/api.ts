export interface ApiResult<T = unknown> {
  ok: boolean;
  data: T;
  error?: string;
  rows?: { row: number; errors: string[] }[];
}

export async function api<T = Record<string, unknown>>(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; rows?: ApiResult["rows"] };
    return { ok: res.ok, data, error: res.ok ? undefined : (data.error ?? "Request failed"), rows: data.rows };
  } catch {
    return { ok: false, data: {} as T, error: "Could not reach the server" };
  }
}
