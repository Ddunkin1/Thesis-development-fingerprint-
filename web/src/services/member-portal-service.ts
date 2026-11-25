// Everything the MEMBER screens need (home, leaderboard, "me"). Read-only except the leaderboard opt-out.
// It only combines data that already exists: attendance, streaks, badges and the membership.
import { MANILA_TZ, addDays, todayManila } from "@/lib/time";
import { goalProgress } from "@/lib/goals";
import { replay } from "@/lib/streak-rules";
import { BADGES } from "@/lib/badges";
import { maskName, firstName } from "@/lib/names";
import { rankFor } from "@/lib/ranks";
import * as attendance from "@/data/attendance";
import { countTemplatesOf } from "@/data/fingerprints";
import * as members from "@/data/members";
import * as streaks from "@/data/streaks";
import * as users from "@/data/users";
import { daysLeft, statusOf, type MembershipStatus } from "./membership-rules";
import { getStreakView, leaderboard } from "./streak-service";

export class PortalError extends Error {}

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, ...o }).format(d);
const NEW_BADGE_DAYS = 7; // a badge earned in the last week is tagged "NEW"

export async function getPortal(userId: number) {
  const today = todayManila();
  const fingersStored = await countTemplatesOf(userId);
  const [member, user, view, totalVisits, thisMonth, recent, todayRow, owned] = await Promise.all([
    members.findMember(userId),
    users.findById(userId),
    getStreakView(userId, today),
    attendance.visitCount(userId),
    attendance.visitsBetween(userId, today.slice(0, 8) + "01", today),
    attendance.recentVisits(userId, 10),
    attendance.findForDay(userId, today),
    streaks.listBadges(userId),
  ]);
  if (!member || !user) throw new PortalError("Member not found.");

  // ---- badges: earned ones with a date, locked ones with a hint / progress ----
  const earned = new Map(owned.map((b) => [b.badge_key, new Date(b.earned_at)]));
  const progress: Record<string, { have: number; need: number; hint: string; unit: string }> = {
    first_visit: { have: Math.min(totalVisits, 1), need: 1, hint: "Check in once", unit: "visit" },
    seven_day_fire: { have: Math.min(view.current, 7), need: 7, hint: "Reach a 7-day streak", unit: "day" },
    thirty_visits: { have: Math.min(totalVisits, 30), need: 30, hint: "Visit the gym 30 times", unit: "visit" },
    thirty_day_fire: { have: Math.min(view.current, 30), need: 30, hint: "Reach a 30-day streak", unit: "day" },
    hundred_visits: { have: Math.min(totalVisits, 100), need: 100, hint: "Visit the gym 100 times", unit: "visit" },
    perfect_week: { have: view.week.filter((t) => t.attended).length, need: 7, hint: "Work out all 7 days of one week", unit: "day" },
    weekend_warrior: { have: 0, need: 0, hint: "Work out on both Saturday and Sunday", unit: "" },
    early_bird: { have: 0, need: 0, hint: "Check in before 7 AM", unit: "" },
    night_owl: { have: 0, need: 0, hint: "Check in at 9 PM or later", unit: "" },
    comeback: { have: 0, need: 0, hint: "Come back after 14 or more days away", unit: "" },
  };
  const badges = Object.values(BADGES).map((b) => {
    const at = earned.get(b.key);
    return {
      key: b.key, label: b.label, description: b.description,
      earned: !!at,
      earnedOn: at ? fmt(at, { month: "short", day: "numeric" }) : null,
      isNew: !!at && Date.now() - at.getTime() < NEW_BADGE_DAYS * 86_400_000,
      hint: progress[b.key]?.hint ?? "",
    };
  });
  // the closest unearned badge that has a number to count towards ("2 more days to 7-Day Fire")
  const next = Object.entries(progress)
    .filter(([key, p]) => !earned.has(key) && p.need > 0)          // not earned yet, and it can be counted
    .map(([key, p]) => ({ key, ...p, ratio: p.have / p.need }))
    .sort((a, b) => b.ratio - a.ratio)[0];                          // the one they are closest to
  const nextBadge = next
    ? { label: BADGES[next.key].label, remaining: next.need - next.have, unit: next.unit, ratio: next.ratio }
    : null;

  const left = member.expiry_date ? daysLeft(member.expiry_date, today) : null;

  // ---- "your month" recap: this month vs last month, trained time, best streak, usual time of day ----
  const monthStart = today.slice(0, 8) + "01";
  const lastMonthEnd = addDays(monthStart, -1);
  const lastMonthStart = lastMonthEnd.slice(0, 8) + "01";
  const [lastMonthVisits, train, usual, allDates] = await Promise.all([
    attendance.visitsBetween(userId, lastMonthStart, lastMonthEnd),
    attendance.trainingStats(userId, monthStart, today),
    attendance.usualHour(userId, addDays(today, -60), today),
    attendance.attendedDates(userId),
  ]);
  let bestThisMonth = 0;
  for (const [d, info] of replay(allDates).days) if (d >= monthStart && d <= today) bestThisMonth = Math.max(bestThisMonth, info.streak);
  const monthName = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "long" }).format(new Date(iso + "T00:00:00Z"));
  const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

  return {
    firstName: firstName(user.full_name),
    fullName: user.full_name,
    username: user.username,
    checkedInToday: !!todayRow,
    streak: view,                       // current, longest, level, week tiles, history
    rank: rankFor(totalVisits),
    stats: { totalVisits, thisMonth, bestStreak: view.longest },
    nextBadge,
    badges,
    goal: goalProgress(thisMonth, today),
    recap: {
      monthLabel: monthName(today),
      lastMonthLabel: monthName(lastMonthEnd),
      visits: thisMonth,
      visitsLastMonth: lastMonthVisits,
      bestStreak: bestThisMonth,
      hours: Math.round(train.minutes / 6) / 10,          // one decimal
      avgMinutes: train.sessions ? Math.round(train.minutes / train.sessions) : 0,
      sessions: train.sessions,
      usualTime: usual === null ? null : hourText(usual),
    },
    membership: {
      status: (member.expiry_date ? statusOf(member.expiry_date, today) : "none") as MembershipStatus | "none",
      expiryDate: member.expiry_date,
      daysLeft: left,
    },
    leaderboardOptOut: user.leaderboard_opt_out,
    privacy: {
      consentGiven: user.consent_given,
      consentOn: user.consent_at ? fmt(new Date(user.consent_at), { month: "long", day: "numeric", year: "numeric" }) : null,
      withdrawnOn: user.consent_withdrawn_at ? fmt(new Date(user.consent_withdrawn_at), { month: "long", day: "numeric", year: "numeric" }) : null,
      fingersStored,
    },
    visits: recent.map((v) => ({
      day: fmt(new Date(v.check_in), { weekday: "short", month: "short", day: "numeric" }),
      in: fmt(new Date(v.check_in), { hour: "numeric", minute: "2-digit" }),
      out: v.check_out ? fmt(new Date(v.check_out), { hour: "numeric", minute: "2-digit" }) : null,
    })),
  };
}

/** This month's board: top 10 with masked names, plus the member's own rank even if they are lower down. */
export async function getBoard(userId: number) {
  const [{ month, rows }, user] = await Promise.all([leaderboard(undefined, 500), users.findById(userId)]);
  const idx = rows.findIndex((r) => r.userId === userId);
  const row = (r: (typeof rows)[number], rank: number) => ({
    rank, name: maskName(r.name), best: r.bestStreak, current: r.currentStreak, visits: r.visits, isMe: r.userId === userId,
  });
  const above = idx > 0 ? rows[idx - 1] : null;
  return {
    month,
    hidden: !!user?.leaderboard_opt_out,                 // the member chose to stay off the board
    top: rows.slice(0, 10).map((r, i) => row(r, i + 1)),
    me: idx >= 0 ? {
      ...row(rows[idx], idx + 1),
      gap: above ? above.bestStreak - rows[idx].bestStreak : 0,
      aboveName: above ? maskName(above.name) : null,
    } : null,
    total: rows.length,
  };
}

export async function setOptOut(userId: number, optOut: boolean) {
  await users.setLeaderboardOptOut(userId, optOut);
}
