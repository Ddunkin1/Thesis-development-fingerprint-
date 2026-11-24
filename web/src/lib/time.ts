// All "day" and "week" logic uses the Asia/Manila time zone (set APP_TIMEZONE to change).
// Dates are handled as 'YYYY-MM-DD' strings so no hidden time-zone shift can move a day.
export const MANILA_TZ = process.env.APP_TIMEZONE || "Asia/Manila";

/** Today's calendar date in Manila, e.g. "2026-11-24". */
export function todayManila(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Add (or subtract) whole days to a 'YYYY-MM-DD' date. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

/** Monday of the week containing `date` (weeks run Monday to Sunday). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}
