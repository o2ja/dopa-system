// shortcut: Jordan is fixed UTC+3 (no DST since 2022); switch to Intl timeZone "Asia/Amman" if that changes.
const AMMAN_MS = 3 * 3600_000;
const DAY = 86_400_000;
const STEP = 15 * 60_000;

/** "08:00-24:00" or "07:00-01:00" (closes after midnight) -> minutes since midnight; close may exceed 1440. */
function parseHours(hours: string) {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(hours);
  if (!m) return null;
  const open = +m[1] * 60 + +m[2];
  let close = +m[3] * 60 + +m[4];
  if (close <= open) close += 1440;
  return { open, close };
}

export const hoursLabel = (hours: string) => {
  const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(hours);
  return m ? `${m[1]} – ${m[2]}` : hours;
};

const clock = (t: number) => {
  const mins = Math.floor(((t + AMMAN_MS) % DAY) / 60_000);
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
};

/** Pickup slots every 15 min from now+15 until closing, for the current trading day. */
export function pickupSlots(hours: string, now = Date.now()) {
  const p = parseHours(hours);
  if (!p) return [];
  const dayStart = Math.floor((now + AMMAN_MS) / DAY) * DAY - AMMAN_MS;
  const mins = (now - dayStart) / 60_000;
  const tail = mins < p.close - 1440; // still inside yesterday's session that runs past midnight
  const closeAt = dayStart + (tail ? p.close - 1440 : p.close) * 60_000;
  let t = now + STEP;
  if (!tail) t = Math.max(t, dayStart + p.open * 60_000);
  t = Math.ceil(t / STEP) * STEP;
  const out: { value: string; label: string }[] = [];
  for (; t <= closeAt && out.length < 120; t += STEP) out.push({ value: new Date(t).toISOString(), label: clock(t) });
  return out;
}
