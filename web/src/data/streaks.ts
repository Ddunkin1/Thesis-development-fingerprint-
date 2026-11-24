// Data-access layer for streak rows and badges (the rules live in lib/streak-rules.ts and lib/badges.ts).
import { query, type Q } from "@/lib/db";
import type { StreakState } from "@/lib/streak-rules";

export async function ensureStreakRow(userId: number, q: Q = query) {
  await q("INSERT INTO streaks (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId]);
}

interface StreakDb {
  current_streak: number;
  longest_streak: number;
  last_attendance_date: string | null;
  freeze_used_this_week: boolean;
  freeze_week_start: string | null;
}

const toState = (r: StreakDb): StreakState => ({
  current: r.current_streak, longest: r.longest_streak, last: r.last_attendance_date,
  freezeUsed: r.freeze_used_this_week, freezeWeek: r.freeze_week_start,
});

/** Reads (and row-locks, when inside a transaction) the member's stored streak. */
export async function getStreak(userId: number, q: Q = query, lock = false): Promise<StreakState> {
  await ensureStreakRow(userId, q);
  const rows = await q<StreakDb>(`SELECT * FROM streaks WHERE user_id = $1 ${lock ? "FOR UPDATE" : ""}`, [userId]);
  return toState(rows[0]);
}

export async function saveStreak(userId: number, s: StreakState, q: Q = query) {
  await q(
    `UPDATE streaks SET current_streak=$2, longest_streak=$3, last_attendance_date=$4,
            freeze_used_this_week=$5, freeze_week_start=$6 WHERE user_id=$1`,
    [userId, s.current, s.longest, s.last, s.freezeUsed, s.freezeWeek],
  );
}

/** Gives a badge once. Returns true only when it was newly earned. */
export async function awardBadge(userId: number, key: string, q: Q = query): Promise<boolean> {
  const rows = await q("INSERT INTO badges (user_id, badge_key) VALUES ($1, $2) ON CONFLICT (user_id, badge_key) DO NOTHING RETURNING id", [userId, key]);
  return rows.length > 0;
}

export async function listBadges(userId: number, q: Q = query) {
  return q<{ badge_key: string; earned_at: Date }>("SELECT badge_key, earned_at FROM badges WHERE user_id = $1 ORDER BY earned_at", [userId]);
}
