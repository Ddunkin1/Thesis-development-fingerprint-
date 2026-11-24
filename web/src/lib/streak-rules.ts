// Streak rules in ONE pure module (no database, no React) so the admin pages, the kiosk and the
// Phase 2 member pages all use exactly the same logic.
//
// Definitions (weeks run Monday to Sunday, all dates are Manila calendar days 'YYYY-MM-DD'):
//   * Attending on consecutive days grows the streak by 1 per day.
//   * REST-DAY FREEZE: one missed day per week does not break the streak. The missed day itself adds
//     nothing, it is just forgiven (shown as a snowflake tile). Only ONE freeze is available per week.
//   * Missing two or more days in a row, or a second missed day in the same week, resets the streak to 1.
import { addDays, diffDays, weekStart } from "./time";

export interface StreakState {
  current: number;
  longest: number;
  last: string | null;       // last attendance date counted
  freezeUsed: boolean;       // has the freeze been used ...
  freezeWeek: string | null; // ... in the week starting on this Monday?
}

export const EMPTY_STREAK: StreakState = { current: 0, longest: 0, last: null, freezeUsed: false, freezeWeek: null };

export interface AdvanceResult {
  state: StreakState;
  frozenDate: string | null; // the forgiven day, if the freeze was used by this attendance
  gapDays: number | null;    // days since the previous attendance (null for the first ever)
  counted: boolean;          // false when today was already counted
}

/** Apply "the member attended on `today`" to a streak state. */
export function advance(s: StreakState, today: string): AdvanceResult {
  if (s.last === today) return { state: s, frozenDate: null, gapDays: 0, counted: false };

  let current: number;
  let frozenDate: string | null = null;
  let freezeUsed = s.freezeUsed;
  let freezeWeek = s.freezeWeek;
  const gap = s.last ? diffDays(s.last, today) : null;

  if (gap === null) current = 1;                       // very first visit
  else if (gap === 1) current = s.current + 1;         // consecutive day
  else if (gap === 2) {                                // exactly one missed day -> maybe forgiven
    const missed = addDays(s.last!, 1);
    const wk = weekStart(missed);
    const freezeAvailable = !(s.freezeUsed && s.freezeWeek === wk);
    if (freezeAvailable) { current = s.current + 1; frozenDate = missed; freezeUsed = true; freezeWeek = wk; }
    else current = 1;
  } else current = 1;                                  // 2+ missed days: streak broken

  return {
    state: { current, longest: Math.max(s.longest, current), last: today, freezeUsed, freezeWeek },
    frozenDate,
    gapDays: gap,
    counted: true,
  };
}

/** The streak to DISPLAY today: a streak that can no longer be saved shows 0 even before the next visit. */
export function effectiveCurrent(s: StreakState, today: string): number {
  if (!s.last || s.current === 0) return 0;
  const gap = diffDays(s.last, today);
  if (gap <= 1) return s.current;
  if (gap === 2) {
    const wk = weekStart(addDays(s.last, 1));
    return s.freezeUsed && s.freezeWeek === wk ? 0 : s.current; // still saveable by attending today
  }
  return 0;
}

export interface DayInfo { streak: number }
export interface Replay { days: Map<string, DayInfo>; frozen: Set<string>; final: StreakState }

/** Re-run the rules over a member's attendance history to get the streak value on every attended day. */
export function replay(dates: string[]): Replay {
  const days = new Map<string, DayInfo>();
  const frozen = new Set<string>();
  let state = EMPTY_STREAK;
  for (const d of [...new Set(dates)].sort()) {
    const r = advance(state, d);
    state = r.state;
    if (r.frozenDate) frozen.add(r.frozenDate);
    days.set(d, { streak: state.current });
  }
  return { days, frozen, final: state };
}

/** 0 = no workout, 1 = light purple, 2 = purple (2-3), 3 = deep purple + fire (4-5), 4 = glowing fire gradient (6+). */
export type Level = 0 | 1 | 2 | 3 | 4;
export function levelOf(streakOnDay: number): Level {
  if (streakOnDay <= 0) return 0;
  if (streakOnDay === 1) return 1;
  if (streakOnDay <= 3) return 2;
  if (streakOnDay <= 5) return 3;
  return 4;
}

export interface Tile { date: string; label: string; attended: boolean; frozen: boolean; streak: number; level: Level; isToday: boolean; future: boolean }

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The 7 tiles (Mon-Sun) of the week containing `today`. */
export function weekTiles(r: Replay, today: string): Tile[] {
  const start = weekStart(today);
  return LABELS.map((label, i) => {
    const date = addDays(start, i);
    const info = r.days.get(date);
    return {
      date, label,
      attended: !!info,
      frozen: r.frozen.has(date) && !info,
      streak: info?.streak ?? 0,
      level: info ? levelOf(info.streak) : 0,
      isToday: date === today,
      future: date > today,
    };
  });
}

export interface HistoryDay { date: string; attended: boolean; frozen: boolean; future: boolean }

/** The last 8 weeks (Monday-aligned, 56 days, ending Sunday of this week) for the consistency calendar. */
export function history(r: Replay, today: string, weeks = 8): HistoryDay[] {
  const start = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, attended: r.days.has(date), frozen: r.frozen.has(date) && !r.days.has(date), future: date > today };
  });
}
