// Numbers for the admin dashboard.
import { MANILA_TZ, addDays, todayManila } from "@/lib/time";
import * as r from "@/data/reports";
import { statusOf, type MembershipStatus } from "./membership-rules";

const fmt = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }).format(d);

export async function getDashboard() {
  const today = todayManila();
  const monthStart = today.slice(0, 8) + "01";
  const [counts, checkinsToday, walkinsToday, incomeToday, incomeMonth, recent, hours, attention] = await Promise.all([
    r.membershipCounts(today),
    r.checkinsOn(today),
    r.walkinsOn(today),
    r.incomeBetween(today, today),
    r.incomeBetween(monthStart, today),
    r.recentAttendance(10),
    r.peakHours(addDays(today, -29), today), // last 30 days
    r.needsAttention(today),
  ]);

  const byHour = new Map(hours.map((h) => [h.h, Number(h.n)]));
  return {
    today,
    members: counts,
    checkinsToday,
    walkinsToday,
    incomeToday,
    incomeMonth,
    recent: recent.map((a) => ({ name: a.full_name, checkIn: fmt(a.check_in), checkOut: a.check_out ? fmt(a.check_out) : null })),
    peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour.get(h) ?? 0 })),
    attention: attention.map((a) => ({
      id: Number(a.id), name: a.full_name, expiryDate: a.expiry_date,
      status: statusOf(a.expiry_date, today) as MembershipStatus,
    })),
  };
}
