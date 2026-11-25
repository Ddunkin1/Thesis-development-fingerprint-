// Check-in rules: what happens when a fingerprint has been identified (or not), or staff check someone in by hand.
//   - unknown finger                -> "no_match" (logged for the accuracy report)
//   - expired membership            -> "expired" and NO attendance is recorded
//   - first valid scan of the day   -> check-in
//   - scan again later the same day -> check-out (once)
//   - scan again right after / after checking out -> "already" (duplicate check-ins are blocked)
// A manual entry (finger could not be read) follows exactly the same rules, is marked "manual", and is NOT written
// to the scan log, so it never affects the scanner's accuracy figures.
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
  | { status: "replayed" }
  | { status: "expired"; name: string; expiryDate: string }
  | {
      status: "checked_in" | "checked_out" | "already";
      name: string; time: string; daysLeft: number; expiringSoon: boolean; message?: string;
      streak: StreakView; newBadges: CheckInStreak["newBadges"];
    };

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, hour: "numeric", minute: "2-digit" }).format(d);

export async function handleScan(userId: number | null, nonce: string): Promise<ScanOutcome> {
  const member = userId === null ? null : await members.findMember(userId);
  const known = !!member?.expiry_date;
  // Written first: it is also what makes a signed result usable only once.
  const fresh = await attendance.logScan(known, known ? userId : null, nonce);
  if (!fresh) return { status: "replayed" };
  if (userId === null) return { status: "no_match" };
  if (!member || !member.expiry_date) return { status: "not_found" };
  return recordVisit(userId, member.full_name, member.expiry_date);
}

export class ManualCheckInError extends Error {}

/** Front-desk fallback when a finger cannot be read. The reason is required and kept with the record. */
export async function manualCheckIn(userId: number, reason: string, staffId: number) {
  const member = await members.findMember(userId);
  if (!member || !member.expiry_date) throw new ManualCheckInError("Member not found.");
  const outcome = await recordVisit(userId, member.full_name, member.expiry_date, { reason, by: staffId });
  if (outcome.status === "expired") throw new ManualCheckInError(`This membership expired on ${member.expiry_date}. Renew it first.`);
  return outcome;
}

async function recordVisit(userId: number, name: string, expiryDate: string, manual?: { reason: string; by: number }): Promise<ScanOutcome> {
  const today = todayManila();
  if (statusOf(expiryDate, today) === "expired") return { status: "expired", name, expiryDate };
  const left = daysLeft(expiryDate, today);
  const base = { name, daysLeft: left, expiringSoon: left <= 3 };

  return withTx(async (q): Promise<ScanOutcome> => {
    const view = (extra: Partial<CheckInStreak> = {}) => getStreakView(userId, today, q).then((v) => ({ streak: v, newBadges: [], ...extra }));
    const existing = await attendance.findForDay(userId, today, q);
    if (!existing) {
      if (await attendance.insertCheckIn(userId, q, manual)) {
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
