// Numbers for the admin dashboard.
import { MANILA_TZ, addDays, todayManila } from "@/lib/time";
import * as r from "@/data/reports";
import { statusOf, type MembershipStatus } from "./membership-rules";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }).format(d);

export async function getDashboard() {
  const today = todayManila();
  const monthStart = today.slice(0, 8) + "01";
  const yesterday = addDays(today, -1);
  const [counts, checkinsToday, walkinsToday, incomeToday, incomeMonth, recent, hours, attention, incomeYesterday, hoursToday, avg] = await Promise.all([
    r.membershipCounts(today),
    r.checkinsOn(today),
    r.walkinsOn(today),
    r.incomeBetween(today, today),
    r.incomeBetween(monthStart, today),
    r.recentAttendance(10),
    r.peakHours(addDays(today, -29), today), // last 30 days
    r.needsAttention(today),
    r.incomeBetween(yesterday, yesterday),
    r.peakHours(today, today),
    r.avgSession(addDays(today, -29), today),
  ]);
  const busiest = (rows: { h: number; n: string }[]) => rows.reduce<{ h: number; n: number } | null>((best, x) => (!best || Number(x.n) > best.n ? { h: x.h, n: Number(x.n) } : best), null);
  const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
  const todayPeak = busiest(hoursToday);

  const byHour = new Map(hours.map((h) => [h.h, Number(h.n)]));
  return {
    today,
    members: counts,
    checkinsToday,
    walkinsToday,
    incomeToday,
    incomeMonth,
    incomeYesterday,
    peakHourToday: todayPeak ? hourText(todayPeak.h) : null,
    avgWorkoutMinutes: avg.minutes,
    avgWorkoutSessions: avg.sessions,
    recent: recent.map((a) => ({
      name: a.full_name,
      username: a.username,
      checkIn: fmt(a.check_in),
      checkOut: a.check_out ? fmt(a.check_out) : null,
      minutes: a.check_out ? Math.max(0, Math.round((a.check_out.getTime() - a.check_in.getTime()) / 60000)) : null,
    })),
    peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour.get(h) ?? 0 })),
    attention: attention.map((a) => ({
      id: Number(a.id), name: a.full_name, expiryDate: a.expiry_date,
      status: statusOf(a.expiry_date, today) as MembershipStatus,
    })),
  };
}
