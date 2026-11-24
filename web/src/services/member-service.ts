// Business rules for managing existing monthly members (list, renew, edit, reset password, delete, re-enroll).
import bcrypt from "bcryptjs";
import { withTx } from "@/lib/db";
import { todayManila } from "@/lib/time";
import { defaultPassword } from "@/lib/accounts";
import * as members from "@/data/members";
import * as users from "@/data/users";
import * as fingerprints from "@/data/fingerprints";
import * as payments from "@/data/payments";
import { MEMBERSHIP_PRICE } from "@/lib/pricing";
import { daysLeft, renewedExpiry, statusOf, type MembershipStatus } from "./membership-rules";

export interface MemberView {
  id: number;
  fullName: string;
  username: string;
  startDate: string | null;
  expiryDate: string | null;
  daysLeft: number | null;
  status: MembershipStatus | "none";
  fingers: number;
  streak: number;
  paid: number; // net money paid (payments minus refunds)
  joinedOn: string; // "Nov 25, 2026"
}

export class MemberError extends Error {}

export async function listMembers(search: string): Promise<MemberView[]> {
  const today = todayManila();
  const rows = await members.listMembers(search);
  return rows.map((r) => ({
    id: Number(r.id),
    fullName: r.full_name,
    username: r.username,
    startDate: r.start_date,
    expiryDate: r.expiry_date,
    daysLeft: r.expiry_date ? daysLeft(r.expiry_date, today) : null,
    status: r.expiry_date ? statusOf(r.expiry_date, today) : "none",
    fingers: Number(r.fingers),
    streak: r.streak,
    paid: Number(r.paid),
    joinedOn: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(new Date(r.created_at)),
  }));
}

/**
 * Renewal rule: if the membership has NOT expired yet, expiry += 30 days;
 * if it HAS expired, the new expiry is today + 30 days. Each renewal is recorded in payments at the fixed membership price.
 */
export async function renewMember(userId: number) {
  const today = todayManila();
  return withTx(async (q) => {
    const m = await members.latestMembershipForUpdate(userId, q);
    if (!m) throw new MemberError("This member has no membership to renew.");
    const expiry = renewedExpiry(m.expiry_date, today);
    const expired = daysLeft(m.expiry_date, today) < 0;
    await members.updateMembership(m.id, expired ? today : m.start_date, expiry, q);
    await payments.insertPayment({ userId, type: "monthly", amount: MEMBERSHIP_PRICE }, q);
    return { expiryDate: expiry };
  });
}

export async function renameMember(userId: number, fullName: string) {
  await members.updateName(userId, fullName);
}

/** Reset to the default password (lastname + "Chaq"); the member must change it at next login. */
export async function resetPassword(userId: number) {
  const m = await members.findMember(userId);
  if (!m) throw new MemberError("Member not found.");
  const password = defaultPassword(m.full_name);
  await users.setPassword(userId, await bcrypt.hash(password, 12), true);
  return { username: m.username, password };
}

/**
 * Delete a member. If `refund` is given (the member backed out and got their money back), a NEGATIVE payment is
 * recorded so income reports drop by that amount, and the original payments stay as history (labelled with the
 * member's name). Without a refund the sales are kept as they were.
 */
export async function removeMember(userId: number, refund = 0) {
  await withTx(async (q) => {
    const m = await members.findMember(userId, q);
    if (!m) throw new MemberError("Member not found.");
    const paid = await payments.netPaidBy(userId, q);
    if (refund < 0 || refund > paid) throw new MemberError(`The refund cannot be more than what the member paid (₱${paid}).`);
    await payments.labelPaymentsOf(userId, `Member: ${m.full_name} (${m.username})`, q);
    if (refund > 0) {
      await payments.insertPayment({ type: "monthly", amount: -refund, note: `REFUND - ${m.full_name} (${m.username}) cancelled membership` }, q);
    }
    await members.deleteMember(userId, q);
  });
}

export async function saveFingerprint(userId: number, fingerIndex: number, template: Buffer) {
  if (!(await members.findMember(userId))) throw new MemberError("Member not found.");
  await fingerprints.upsertTemplate(userId, fingerIndex, template);
}

export async function listRecentWalkins() {
  const rows = await members.recentWalkins(todayManila());
  return rows.map((r) => ({ id: Number(r.id), fullName: r.full_name, date: r.session_date, amount: Number(r.amount), converted: !!r.converted_user_id }));
}
