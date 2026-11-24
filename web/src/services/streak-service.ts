// Streak / badge / leaderboard orchestration. The RULES are in lib/streak-rules.ts and lib/badges.ts;
// this file only loads data, calls the rules and saves the result.
import { type Q, query } from "@/lib/db";
import { MANILA_TZ, addDays, diffDays, todayManila, weekStart } from "@/lib/time";
import { BADGES, qualifyingBadges, type BadgeDef } from "@/lib/badges";
import { effectiveCurrent, history, levelOf, replay, weekTiles, type HistoryDay, type Level, type Tile } from "@/lib/streak-rules";
import * as attendance from "@/data/attendance";
import * as streaks from "@/data/streaks";

export interface StreakView {
  current: number;       // streak to display today
  longest: number;
  level: Level;          // visual level of the current streak
  week: Tile[];          // Mon..Sun tiles
  history: HistoryDay[]; // last 8 weeks, for the consistency calendar
  badges: (BadgeDef & { earnedAt: string })[];
}

/** Builds the week tiles + numbers from the attendance history (the history is the source of truth). */
export async function getStreakView(userId: number, today = todayManila(), q: Q = query): Promise<StreakView> {
  const r = replay(await attendance.attendedDates(userId, q));
  const current = effectiveCurrent(r.final, today);
  const owned = await streaks.listBadges(userId, q);
  return {
    current,
    longest: r.final.longest,
    level: levelOf(current),
    week: weekTiles(r, today),
    history: history(r, today),
    badges: owned.filter((b) => BADGES[b.badge_key]).map((b) => ({ ...BADGES[b.badge_key], earnedAt: new Date(b.earned_at).toISOString() })),
  };
}

export interface CheckInStreak extends StreakView {
  newBadges: BadgeDef[];
}

/**
 * Call right after a NEW check-in row was inserted (same transaction).
 * Rebuilds the streak from the attendance history, saves it, and awards any badges that were just earned.
 */
export async function recordCheckIn(userId: number, today: string, q: Q): Promise<CheckInStreak> {
  const dates = await attendance.attendedDates(userId, q);
  const r = replay(dates);
  const previous = dates.length >= 2 ? dates[dates.length - 2] : null; // the visit before today
  const gapDays = previous ? diffDays(previous, today) : null;

  await streaks.ensureStreakRow(userId, q);
  await streaks.saveStreak(userId, r.final, q);

  // facts about THIS check-in for the time-based badges (Early Bird, Night Owl, Perfect Week, Weekend Warrior)
  const wk = weekStart(today);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: MANILA_TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const keys = qualifyingBadges({
    previousLast: previous, gapDays, streak: r.final.current, totalVisits: await attendance.visitCount(userId, q),
    checkInHour: hour,
    daysThisWeek: dates.filter((d) => d >= wk && d <= addDays(wk, 6)).length,
    completedWeekend: diffDays(wk, today) === 6 && dates.includes(addDays(today, -1)), // Sunday, and Saturday was attended too
  });
  const newBadges: BadgeDef[] = [];
  for (const k of keys) if (await streaks.awardBadge(userId, k, q)) newBadges.push(BADGES[k]);

  return { ...(await getStreakView(userId, today, q)), newBadges };
}

export interface LeaderRow { userId: number; name: string; bestStreak: number; currentStreak: number; visits: number }

/** Top streaks of a month (default: this month). Members who opted out are not listed. */
export async function leaderboard(month?: string, limit = 20): Promise<{ month: string; rows: LeaderRow[] }> {
  const today = todayManila();
  const ym = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const from = `${ym}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); // last day of the month

  const rows = await attendance.datesForLeaderboard(from, to);
  const byUser = new Map<string, { name: string; dates: string[] }>();
  for (const r of rows) {
    const e = byUser.get(r.user_id) ?? { name: r.full_name, dates: [] };
    e.dates.push(r.d);
    byUser.set(r.user_id, e);
  }
  const out: LeaderRow[] = [];
  for (const [id, e] of byUser) {
    const rp = replay(e.dates);
    let best = 0, visits = 0;
    for (const [d, info] of rp.days) if (d >= from && d <= to) { visits++; best = Math.max(best, info.streak); }
    out.push({ userId: Number(id), name: e.name, bestStreak: best, currentStreak: effectiveCurrent(rp.final, today), visits });
  }
  out.sort((a, b) => b.bestStreak - a.bestStreak || b.visits - a.visits || a.name.localeCompare(b.name));
  return { month: ym, rows: out.slice(0, limit) };
}
