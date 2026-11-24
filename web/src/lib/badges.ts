// Badge definitions and the rules for earning them (pure, shared with the Phase 2 member pages).
export interface BadgeDef { key: string; label: string; description: string } // the icon is chosen by key in components/BadgeIcon

export const BADGES: Record<string, BadgeDef> = {
  first_visit: { key: "first_visit", label: "First Visit", description: "Checked in for the very first time." },
  seven_day_fire: { key: "seven_day_fire", label: "7-Day Fire", description: "Reached a 7-day streak." },
  thirty_visits: { key: "thirty_visits", label: "30 Visits", description: "Visited the gym 30 times." },
  comeback: { key: "comeback", label: "Comeback", description: "Returned after 14 or more days away." },
};

/** Which badges does this check-in qualify for? (Already-owned ones are filtered out by the database.) */
export function qualifyingBadges(i: { previousLast: string | null; gapDays: number | null; streak: number; totalVisits: number }): string[] {
  const keys: string[] = [];
  if (i.previousLast === null || i.totalVisits <= 1) keys.push("first_visit");
  if (i.streak >= 7) keys.push("seven_day_fire");
  if (i.totalVisits >= 30) keys.push("thirty_visits");
  if (i.gapDays !== null && i.gapDays >= 14) keys.push("comeback");
  return keys;
}

/** Streak lengths that get a celebration on the kiosk. */
export const MILESTONES = [7, 30, 100, 365];
