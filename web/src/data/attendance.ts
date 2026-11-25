// Data-access layer for attendance and the scan log.
import { query, type Q } from "@/lib/db";
import { MANILA_TZ } from "@/lib/time";

export interface AttendanceRow {
  id: string;
  check_in: Date;
  check_out: Date | null;
}

// Manila calendar day of a check-in. The zone comes from config (APP_TIMEZONE), never from user input.
const DAY = `(check_in AT TIME ZONE '${MANILA_TZ}')::date`;

/** Today's attendance row for a member (day boundaries are Manila midnight, not UTC). */
export async function findForDay(userId: number, day: string, q: Q = query): Promise<AttendanceRow | null> {
  const rows = await q<AttendanceRow>(
    `SELECT id, check_in, check_out FROM attendance WHERE user_id = $1 AND ${DAY} = $2::date ORDER BY check_in DESC LIMIT 1`,
    [userId, day],
  );
  return rows[0] ?? null;
}

/** Inserts a check-in; returns false if the one-per-day unique index already has one (duplicate). */
export async function insertCheckIn(userId: number, q: Q = query, manual?: { reason: string; by: number }): Promise<boolean> {
  const rows = await q(
    "INSERT INTO attendance (user_id, method, manual_reason, recorded_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id",
    [userId, manual ? "manual" : "fingerprint", manual?.reason ?? null, manual?.by ?? null],
  );
  return rows.length > 0;
}

export async function setCheckOut(id: string, q: Q = query) {
  await q("UPDATE attendance SET check_out = now() WHERE id = $1 AND check_out IS NULL", [id]);
}

/** Logs one scanner result. Returns false if this signed result (nonce) was already used. */
export async function logScan(success: boolean, matchedUserId: number | null, nonce: string, q: Q = query): Promise<boolean> {
  const rows = await q(
    "INSERT INTO scan_log (success, matched_user_id, nonce) VALUES ($1, $2, $3) ON CONFLICT (nonce) DO NOTHING RETURNING id",
    [success, matchedUserId, nonce],
  );
  return rows.length > 0;
}

/** Every distinct Manila day this member attended, oldest first. */
export async function attendedDates(userId: number, q: Q = query): Promise<string[]> {
  const rows = await q<{ d: string }>(`SELECT DISTINCT ${DAY} AS d FROM attendance WHERE user_id = $1 ORDER BY d`, [userId]);
  return rows.map((r) => r.d);
}

export async function visitCount(userId: number, q: Q = query): Promise<number> {
  const rows = await q<{ n: string }>("SELECT count(*) AS n FROM attendance WHERE user_id = $1", [userId]);
  return Number(rows[0].n);
}

/** Attendance days of every opted-in member who attended in [from, to] (used by the leaderboard). */
export async function datesForLeaderboard(from: string, to: string, q: Q = query) {
  return q<{ user_id: string; full_name: string; d: string }>(
    `SELECT a.user_id, u.full_name, ${DAY.replace(/check_in/g, "a.check_in")} AS d
       FROM attendance a JOIN users u ON u.id = a.user_id
      WHERE u.role = 'member' AND u.leaderboard_opt_out = false
        AND a.user_id IN (SELECT user_id FROM attendance WHERE ${DAY} BETWEEN $1::date AND $2::date)
      ORDER BY a.user_id, d`,
    [from, to],
  );
}

/** Number of check-ins in [from, to] (Manila days). */
export async function visitsBetween(userId: number, from: string, to: string, q: Q = query): Promise<number> {
  const rows = await q<{ n: string }>(`SELECT count(*) AS n FROM attendance WHERE user_id = $1 AND ${DAY} BETWEEN $2::date AND $3::date`, [userId, from, to]);
  return Number(rows[0].n);
}

/** A member's latest visits, newest first. */
export async function recentVisits(userId: number, limit = 10, q: Q = query) {
  return q<{ day: string; check_in: Date; check_out: Date | null }>(
    `SELECT ${DAY} AS day, check_in, check_out FROM attendance WHERE user_id = $1 ORDER BY check_in DESC LIMIT $2`,
    [userId, limit],
  );
}

/** Total minutes trained (finished sessions only) and how many sessions, in [from, to]. */
export async function trainingStats(userId: number, from: string, to: string, q: Q = query) {
  const rows = await q<{ mins: string; n: string }>(
    `SELECT COALESCE(sum(extract(epoch FROM (check_out - check_in)) / 60), 0) AS mins, count(*) AS n
       FROM attendance WHERE user_id = $1 AND check_out IS NOT NULL AND ${DAY} BETWEEN $2::date AND $3::date`,
    [userId, from, to],
  );
  return { minutes: Math.round(Number(rows[0].mins)), sessions: Number(rows[0].n) };
}

/** The hour of day (Manila, 0-23) this member checks in most often in [from, to], or null with no visits. */
export async function usualHour(userId: number, from: string, to: string, q: Q = query): Promise<number | null> {
  const rows = await q<{ h: number }>(
    `SELECT extract(hour FROM check_in AT TIME ZONE '${MANILA_TZ}')::int AS h, count(*) AS n
       FROM attendance WHERE user_id = $1 AND ${DAY} BETWEEN $2::date AND $3::date
      GROUP BY h ORDER BY n DESC, h LIMIT 1`,
    [userId, from, to],
  );
  return rows[0]?.h ?? null;
}
