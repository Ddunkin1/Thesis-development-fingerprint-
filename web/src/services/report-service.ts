// Attendance history and the reports. Each report returns { headers, rows } so the same data feeds the
// on-screen table and the CSV export.
import { MANILA_TZ, addDays, diffDays, todayManila } from "@/lib/time";
import * as r from "@/data/reports";
import type { Group } from "@/data/reports";

export class ReportInputError extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a date range (default: the last 30 days, max 1 year). */
export function parseRange(from: string | null, to: string | null) {
  const today = todayManila();
  const f = from && DATE.test(from) ? from : addDays(today, -29);
  const t = to && DATE.test(to) ? to : today;
  if (f > t) throw new ReportInputError("The start date must be before the end date.");
  if (diffDays(f, t) > 366) throw new ReportInputError("Please choose a range of one year or less.");
  return { from: f, to: t };
}

export const parseGroup = (g: string | null): Group => (g === "week" || g === "month" ? g : "day");

export interface Table { headers: string[]; rows: (string | number)[][] }

const time = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, hour: "numeric", minute: "2-digit" }).format(d);
const minutes = (a: Date, b: Date | null) => (b ? Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000)) : "");
const peso = (n: number) => Math.round(n * 100) / 100;

export async function attendanceHistory(from: string, to: string, search: string): Promise<Table> {
  const rows = await r.attendanceHistory(from, to, search);
  return {
    headers: ["Date", "Member", "Username", "Check-in", "Check-out", "Minutes"],
    rows: rows.map((a) => [a.day, a.full_name, a.username, time(a.check_in), a.check_out ? time(a.check_out) : "", minutes(a.check_in, a.check_out)]),
  };
}

export type Section = "attendance" | "traffic" | "streaks" | "accuracy" | "inactive";
export const SECTIONS: Section[] = ["attendance", "traffic", "streaks", "accuracy", "inactive"];

export async function buildReport(section: Section, from: string, to: string, group: Group): Promise<Table> {
  switch (section) {
    case "attendance": {
      const rows = await r.attendanceByPeriod(from, to, group);
      return {
        headers: [group === "day" ? "Date" : group === "week" ? "Week starting (Mon)" : "Month starting", "Check-ins", "Unique members"],
        rows: rows.map((x) => [x.p, Number(x.checkins), Number(x.members)]),
      };
    }
    case "traffic": {
      // Monthly members vs walk-ins: visits and income per period.
      const [att, walk, inc] = await Promise.all([r.attendanceByPeriod(from, to, group), r.walkinsByPeriod(from, to, group), r.incomeByPeriod(from, to, group)]);
      const m = new Map<string, { monthlyVisits: number; walkinVisits: number; monthlyIncome: number; walkinIncome: number }>();
      const get = (p: string) => m.get(p) ?? (m.set(p, { monthlyVisits: 0, walkinVisits: 0, monthlyIncome: 0, walkinIncome: 0 }), m.get(p)!);
      att.forEach((x) => (get(x.p).monthlyVisits = Number(x.checkins)));
      walk.forEach((x) => (get(x.p).walkinVisits = Number(x.visits)));
      inc.forEach((x) => { const e = get(x.p); if (x.type === "monthly") e.monthlyIncome = Number(x.total); else e.walkinIncome = Number(x.total); });
      return {
        headers: ["Period", "Monthly member visits", "Walk-in visits", "Monthly income (PHP)", "Walk-in income (PHP)", "Total income (PHP)"],
        rows: [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([p, e]) => [p, e.monthlyVisits, e.walkinVisits, peso(e.monthlyIncome), peso(e.walkinIncome), peso(e.monthlyIncome + e.walkinIncome)]),
      };
    }
    case "streaks": {
      const rows = await r.topStreaks(10);
      return {
        headers: ["Rank", "Member", "Longest streak", "Current streak", "Last attendance"],
        rows: rows.map((x, i) => [i + 1, x.full_name, x.longest_streak, x.current_streak, x.last_attendance_date ?? ""]),
      };
    }
    case "accuracy": {
      const rows = await r.scanAccuracy(from, to);
      const pct = (ok: number, total: number) => (total ? Math.round((ok / total) * 1000) / 10 : 0);
      const body = rows.map((x) => [x.day, Number(x.total), Number(x.ok), Number(x.total) - Number(x.ok), pct(Number(x.ok), Number(x.total))]);
      const total = rows.reduce((s, x) => s + Number(x.total), 0);
      const ok = rows.reduce((s, x) => s + Number(x.ok), 0);
      if (rows.length) body.push(["TOTAL", total, ok, total - ok, pct(ok, total)]);
      return { headers: ["Date", "Scans", "Recognised", "Not recognised", "Accuracy %"], rows: body };
    }
    case "inactive": {
      const today = todayManila();
      const rows = await r.inactiveMembers(today, 7);
      return {
        headers: ["Member", "Username", "Last attendance", "Days away", "Membership expires"],
        rows: rows.map((x) => [x.full_name, x.username, x.last_day ?? "never", x.last_day ? diffDays(x.last_day, today) : "-", x.expiry_date ?? ""]),
      };
    }
  }
}
