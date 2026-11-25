// Numbers for the admin dashboard ("Today").
import { MANILA_TZ, addDays, todayManila } from "@/lib/time";
import * as r from "@/data/reports";
import { statusOf, type MembershipStatus } from "./membership-rules";

const timeOf = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, hour: "numeric", minute: "2-digit" }).format(d);
const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: MANILA_TZ }).format(d); // 'YYYY-MM-DD'
const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, month: "short", day: "numeric" }).format(d);

/** `withMoney` is false until the PIN is typed: income figures are then not even sent to the browser. */
export async function getDashboard(withMoney: boolean) {
  const today = todayManila();
  const monthStart = today.slice(0, 8) + "01";
  const yesterday = addDays(today, -1);
  const [counts, checkinsToday, walkinsToday, incomeToday, incomeMonth, recent, hours, attention, incomeYesterday, hoursToday, stillIn] = await Promise.all([
    r.membershipCounts(today),
    r.checkinsOn(today),
    r.walkinsOn(today),
    r.incomeBetween(today, today),
    r.incomeBetween(monthStart, today),
    r.recentAttendance(12),
    r.peakHours(addDays(today, -29), today), // last 30 days
    r.needsAttention(today),
    r.incomeBetween(yesterday, yesterday),
    r.peakHours(today, today),
    r.stillInCount(today),
  ]);
  const busiest = (rows: { h: number; n: string }[]) => rows.reduce<{ h: number; n: number } | null>((best, x) => (!best || Number(x.n) > best.n ? { h: x.h, n: Number(x.n) } : best), null);
  const hourText = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
  const todayPeak = busiest(hoursToday);

  const byHour = new Map(hours.map((h) => [h.h, Number(h.n)]));
  return {
    today,
    members: counts,
    checkinsToday,
    stillInGym: stillIn,                       // checked in today and not checked out yet
    walkinsToday,
    incomeToday: withMoney ? incomeToday : null,
    incomeMonth: withMoney ? incomeMonth : null,
    incomeYesterday: withMoney ? incomeYesterday : null,
    peakHourToday: todayPeak ? hourText(todayPeak.h) : null,
    // the live feed: newest visits first, today's flagged so the screen can group them
    feed: recent.map((a) => ({
      name: a.full_name,
      username: a.username,
      isToday: dayOf(a.check_in) === today,
      day: dayLabel(a.check_in),
      checkIn: timeOf(a.check_in),
      checkOut: a.check_out ? timeOf(a.check_out) : null,
      minutes: a.check_out ? Math.max(0, Math.round((a.check_out.getTime() - a.check_in.getTime()) / 60000)) : null,
      sinceMin: a.check_out ? null : Math.max(0, Math.round((Date.now() - a.check_in.getTime()) / 60000)),
    })),
    peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour.get(h) ?? 0 })),
    attention: attention.map((a) => ({
      id: Number(a.id), name: a.full_name, expiryDate: a.expiry_date,
      status: statusOf(a.expiry_date, today) as MembershipStatus,
    })),
  };
}
