// Data-access layer for the dashboard, attendance history and reports (read-only SQL aggregates).
// Every "day" is a Manila calendar day. The zone name comes from config, never from user input.
import { query } from "@/lib/db";
import { MANILA_TZ } from "@/lib/time";

const tz = MANILA_TZ;
const dayOf = (col: string) => `(${col} AT TIME ZONE '${tz}')::date`;

export type Group = "day" | "week" | "month";
// Whitelisted SQL for grouping: weeks start on Monday (date_trunc('week') is ISO Monday-based).
const bucket = (col: string, g: Group) =>
  g === "day" ? dayOf(col) : `date_trunc('${g}', ${col} AT TIME ZONE '${tz}')::date`;

// ------------------------------------------------------------------ dashboard

export async function membershipCounts(today: string) {
  const r = await query<{ active: string; expiring: string; expired: string }>(
    `SELECT count(*) FILTER (WHERE m.expiry_date >= $1::date) AS active,
            count(*) FILTER (WHERE m.expiry_date BETWEEN $1::date AND $1::date + 3) AS expiring,
            count(*) FILTER (WHERE m.expiry_date < $1::date) AS expired
       FROM users u
       JOIN LATERAL (SELECT expiry_date FROM memberships WHERE user_id = u.id ORDER BY expiry_date DESC LIMIT 1) m ON true
      WHERE u.role = 'member'`,
    [today],
  );
  return { active: Number(r[0].active), expiring: Number(r[0].expiring), expired: Number(r[0].expired) };
}

export async function needsAttention(today: string) {
  return query<{ id: string; full_name: string; expiry_date: string }>(
    `SELECT u.id, u.full_name, m.expiry_date
       FROM users u
       JOIN LATERAL (SELECT expiry_date FROM memberships WHERE user_id = u.id ORDER BY expiry_date DESC LIMIT 1) m ON true
      WHERE u.role = 'member' AND m.expiry_date <= $1::date + 3
      ORDER BY m.expiry_date DESC LIMIT 8`,
    [today],
  );
}

export async function checkinsOn(day: string) {
  const r = await query<{ n: string }>(`SELECT count(*) n FROM attendance WHERE ${dayOf("check_in")} = $1::date`, [day]);
  return Number(r[0].n);
}

export async function walkinsOn(day: string) {
  const r = await query<{ n: string }>("SELECT count(*) n FROM walkin_sessions WHERE session_date = $1::date", [day]);
  return Number(r[0].n);
}

export async function incomeBetween(from: string, to: string) {
  const r = await query<{ s: string | null }>(
    `SELECT COALESCE(sum(amount), 0) s FROM payments WHERE ${dayOf("paid_at")} BETWEEN $1::date AND $2::date`,
    [from, to],
  );
  return Number(r[0].s);
}

export async function recentAttendance(limit = 10) {
  return query<{ full_name: string; check_in: Date; check_out: Date | null }>(
    `SELECT u.full_name, a.check_in, a.check_out FROM attendance a JOIN users u ON u.id = a.user_id
      ORDER BY a.check_in DESC LIMIT $1`,
    [limit],
  );
}

/** Check-ins per hour of the day (Manila time) over a date range. */
export async function peakHours(from: string, to: string) {
  return query<{ h: number; n: string }>(
    `SELECT extract(hour FROM check_in AT TIME ZONE '${tz}')::int AS h, count(*) AS n
       FROM attendance WHERE ${dayOf("check_in")} BETWEEN $1::date AND $2::date GROUP BY h ORDER BY h`,
    [from, to],
  );
}

// ------------------------------------------------------------------ attendance history

export async function attendanceHistory(from: string, to: string, search: string, limit = 2000) {
  const pattern = "%" + search.trim().replace(/[\\%_]/g, (c) => "\\" + c) + "%";
  return query<{ day: string; full_name: string; username: string; check_in: Date; check_out: Date | null }>(
    `SELECT ${dayOf("a.check_in")} AS day, u.full_name, u.username, a.check_in, a.check_out
       FROM attendance a JOIN users u ON u.id = a.user_id
      WHERE ${dayOf("a.check_in")} BETWEEN $1::date AND $2::date
        AND ($3 = '' OR u.full_name ILIKE $4 OR u.username ILIKE $4)
      ORDER BY a.check_in DESC LIMIT $5`,
    [from, to, search.trim(), pattern, limit],
  );
}

// ------------------------------------------------------------------ reports

export async function attendanceByPeriod(from: string, to: string, g: Group) {
  return query<{ p: string; checkins: string; members: string }>(
    `SELECT ${bucket("check_in", g)} AS p, count(*) AS checkins, count(DISTINCT user_id) AS members
       FROM attendance WHERE ${dayOf("check_in")} BETWEEN $1::date AND $2::date GROUP BY p ORDER BY p`,
    [from, to],
  );
}

export async function walkinsByPeriod(from: string, to: string, g: Group) {
  const b = g === "day" ? "session_date" : `date_trunc('${g}', session_date)::date`;
  return query<{ p: string; visits: string }>(
    `SELECT ${b} AS p, count(*) AS visits FROM walkin_sessions WHERE session_date BETWEEN $1::date AND $2::date GROUP BY p ORDER BY p`,
    [from, to],
  );
}

export async function incomeByPeriod(from: string, to: string, g: Group) {
  return query<{ p: string; type: string; total: string }>(
    `SELECT ${bucket("paid_at", g)} AS p, type, COALESCE(sum(amount), 0) AS total
       FROM payments WHERE ${dayOf("paid_at")} BETWEEN $1::date AND $2::date GROUP BY p, type ORDER BY p`,
    [from, to],
  );
}

export async function topStreaks(limit = 10) {
  return query<{ full_name: string; current_streak: number; longest_streak: number; last_attendance_date: string | null }>(
    `SELECT u.full_name, s.current_streak, s.longest_streak, s.last_attendance_date
       FROM streaks s JOIN users u ON u.id = s.user_id
      WHERE u.role = 'member' AND s.longest_streak > 0
      ORDER BY s.longest_streak DESC, s.current_streak DESC LIMIT $1`,
    [limit],
  );
}

export async function scanAccuracy(from: string, to: string) {
  return query<{ day: string; total: string; ok: string }>(
    `SELECT ${dayOf("scanned_at")} AS day, count(*) AS total, count(*) FILTER (WHERE success) AS ok
       FROM scan_log WHERE ${dayOf("scanned_at")} BETWEEN $1::date AND $2::date GROUP BY day ORDER BY day`,
    [from, to],
  );
}

/** Members whose last attendance was `days`+ days ago (or who never came). */
export async function inactiveMembers(today: string, days: number) {
  return query<{ full_name: string; username: string; last_day: string | null; expiry_date: string | null }>(
    `SELECT u.full_name, u.username, l.last_day, m.expiry_date
       FROM users u
       LEFT JOIN LATERAL (SELECT max(${dayOf("check_in")}) AS last_day FROM attendance WHERE user_id = u.id) l ON true
       LEFT JOIN LATERAL (SELECT expiry_date FROM memberships WHERE user_id = u.id ORDER BY expiry_date DESC LIMIT 1) m ON true
      WHERE u.role = 'member' AND (l.last_day IS NULL OR l.last_day <= $1::date - $2::int)
      ORDER BY l.last_day NULLS FIRST, u.full_name`,
    [today, days],
  );
}
