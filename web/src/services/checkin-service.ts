// Kiosk rules: what happens when a fingerprint has been identified (or not).
//   - unknown finger                -> "no_match" (logged for the accuracy report)
//   - expired membership            -> "expired" and NO attendance is recorded
//   - first valid scan of the day   -> check-in
//   - scan again later the same day -> check-out (once)
//   - scan again right after / after checking out -> "already" (duplicate check-ins are blocked)
import { withTx } from "@/lib/db";
import { MANILA_TZ, todayManila } from "@/lib/time";
import * as attendance from "@/data/attendance";
import * as members from "@/data/members";
import { daysLeft, statusOf } from "./membership-rules";
import { getStreakView, recordCheckIn, type CheckInStreak, type StreakView } from "./streak-service";

// A second scan within this window is treated as an accidental double scan, not a check-out.
const MIN_MINUTES_BEFORE_CHECKOUT = 2;

export type ScanOutcome =
  | { status: "no_match" }
  | { status: "not_found" }
  | { status: "expired"; name: string; expiryDate: string }
  | {
      status: "checked_in" | "checked_out" | "already";
      name: string; time: string; daysLeft: number; expiringSoon: boolean; message?: string;
      streak: StreakView; newBadges: CheckInStreak["newBadges"];
    };

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, hour: "numeric", minute: "2-digit" }).format(d);

export async function handleScan(userId: number | null): Promise<ScanOutcome> {
  if (userId == null) {
    await attendance.logScan(false, null);
    return { status: "no_match" };
  }
  const member = await members.findMember(userId);
  if (!member || !member.expiry_date) {
    await attendance.logScan(false, null);
    return { status: "not_found" };
  }
  await attendance.logScan(true, userId); // the finger was recognised, whatever happens next

  const today = todayManila();
  if (statusOf(member.expiry_date, today) === "expired") {
    return { status: "expired", name: member.full_name, expiryDate: member.expiry_date };
  }
  const left = daysLeft(member.expiry_date, today);
  const base = { name: member.full_name, daysLeft: left, expiringSoon: left <= 3 };

  return withTx(async (q): Promise<ScanOutcome> => {
    const view = (extra: Partial<CheckInStreak> = {}) => getStreakView(userId, today, q).then((v) => ({ streak: v, newBadges: [], ...extra }));
    const existing = await attendance.findForDay(userId, today, q);
    if (!existing) {
      if (await attendance.insertCheckIn(userId, q)) {
        // A new attendance day: update the streak and award badges in the same transaction.
        const s = await recordCheckIn(userId, today, q);
        return { status: "checked_in", time: fmtTime(new Date()), ...base, streak: s, newBadges: s.newBadges };
      }
      return { status: "already", time: fmtTime(new Date()), ...base, ...(await view()) };
    }
    if (existing.check_out) return { status: "already", time: fmtTime(existing.check_out), message: "Already checked out today.", ...base, ...(await view()) };
    const minutes = (Date.now() - new Date(existing.check_in).getTime()) / 60000;
    if (minutes < MIN_MINUTES_BEFORE_CHECKOUT)
      return { status: "already", time: fmtTime(existing.check_in), message: "You are already checked in today.", ...base, ...(await view()) };
    await attendance.setCheckOut(existing.id, q);
    return { status: "checked_out", time: fmtTime(new Date()), ...base, ...(await view()) };
  });
}
