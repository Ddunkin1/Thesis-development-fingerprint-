// The member's monthly goal: a simple, reachable number of visits (about 3 a week), the same for everyone.
import { diffDays } from "./time";

export const MONTHLY_GOAL = 12;

export interface GoalProgress {
  target: number;
  done: number;
  remaining: number;   // visits still needed (0 once reached)
  daysLeft: number;    // days left in the month, counting today
  reached: boolean;
  onTrack: boolean;    // enough days are left to still make it
  percent: number;     // 0..100 for the progress ring
}

/** `today` and the month are Manila dates ('YYYY-MM-DD'). */
export function goalProgress(visitsThisMonth: number, today: string, target = MONTHLY_GOAL): GoalProgress {
  const [y, m] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const daysLeft = diffDays(today, lastDay) + 1;
  const remaining = Math.max(0, target - visitsThisMonth);
  return {
    target,
    done: visitsThisMonth,
    remaining,
    daysLeft,
    reached: remaining === 0,
    onTrack: remaining <= daysLeft,
    percent: Math.min(100, Math.round((visitsThisMonth / target) * 100)),
  };
}
