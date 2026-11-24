// Badge definitions and the rules for earning them (pure, shared by the kiosk, the admin pages and the member app).
export interface BadgeDef { key: string; label: string; description: string } // the icon is chosen by key in components/BadgeIcon

export const BADGES: Record<string, BadgeDef> = {
  first_visit: { key: "first_visit", label: "First Visit", description: "Checked in for the very first time." },
  seven_day_fire: { key: "seven_day_fire", label: "7-Day Fire", description: "Reached a 7-day streak." },
  thirty_day_fire: { key: "thirty_day_fire", label: "30-Day Fire", description: "Reached a 30-day streak." },
  thirty_visits: { key: "thirty_visits", label: "30 Visits", description: "Visited the gym 30 times." },
  hundred_visits: { key: "hundred_visits", label: "100 Visits", description: "Visited the gym 100 times." },
  perfect_week: { key: "perfect_week", label: "Perfect Week", description: "Worked out all 7 days of one week." },
  weekend_warrior: { key: "weekend_warrior", label: "Weekend Warrior", description: "Worked out on both Saturday and Sunday." },
  early_bird: { key: "early_bird", label: "Early Bird", description: "Checked in before 7 AM." },
  night_owl: { key: "night_owl", label: "Night Owl", description: "Checked in at 9 PM or later." },
  comeback: { key: "comeback", label: "Comeback", description: "Returned after 14 or more days away." },
};

/** What the rules need to know about the check-in that just happened (all computed in Manila time). */
export interface BadgeInput {
  previousLast: string | null;  // the visit before this one
  gapDays: number | null;       // days since that visit
  streak: number;               // streak length after this check-in
  totalVisits: number;          // all-time visits including this one
  checkInHour?: number;         // 0-23, hour of this check-in
  daysThisWeek?: number;        // distinct days attended in this Mon-Sun week, including today
  completedWeekend?: boolean;   // today is Sunday and Saturday was attended too
}

/** Which badges does this check-in qualify for? (Already-owned ones are filtered out by the database.) */
export function qualifyingBadges(i: BadgeInput): string[] {
  const keys: string[] = [];
  if (i.previousLast === null || i.totalVisits <= 1) keys.push("first_visit");
  if (i.streak >= 7) keys.push("seven_day_fire");
  if (i.streak >= 30) keys.push("thirty_day_fire");
  if (i.totalVisits >= 30) keys.push("thirty_visits");
  if (i.totalVisits >= 100) keys.push("hundred_visits");
  if ((i.daysThisWeek ?? 0) >= 7) keys.push("perfect_week");
  if (i.completedWeekend) keys.push("weekend_warrior");
  if (i.checkInHour !== undefined && i.checkInHour < 7) keys.push("early_bird");
  if (i.checkInHour !== undefined && i.checkInHour >= 21) keys.push("night_owl");
  if (i.gapDays !== null && i.gapDays >= 14) keys.push("comeback");
  return keys;
}

/** Streak lengths that get a celebration on the kiosk. */
export const MILESTONES = [7, 30, 100, 365];
