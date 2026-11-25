// Business rules for registering people: monthly members (account + fingerprint + 30-day membership + payment)
// and walk-ins (name only, one session today). Each registration is ONE database transaction: all or nothing.
import bcrypt from "bcryptjs";
import { withTx } from "@/lib/db";
import { todayManila } from "@/lib/time";
import { baseUsername, defaultPassword, lastName, pickUsername } from "@/lib/accounts";
import * as users from "@/data/users";
import * as fingerprints from "@/data/fingerprints";
import * as memberships from "@/data/memberships";
import * as payments from "@/data/payments";
import * as walkins from "@/data/walkins";
import * as streaks from "@/data/streaks";
import { markWalkinConverted } from "@/data/members";
import { MEMBERSHIP_PRICE } from "@/lib/pricing";
import { CONSENT_VERSION } from "@/lib/consent";
import { newTerm } from "./membership-rules";

export class RegistrationError extends Error {}

export interface EnrolledFinger {
  fingerIndex: number;
  template: Buffer;
}

/** What the admin sees on screen before saving (live preview of the generated account). */
export async function previewAccount(fullName: string) {
  if (!lastName(fullName)) return null;
  const taken = await users.usernamesStartingWith(baseUsername(fullName));
  return { username: pickUsername(baseUsername(fullName), taken), password: defaultPassword(fullName) };
}

export async function registerMonthlyMember(input: {
  fullName: string;
  consent: boolean;
  fingers: EnrolledFinger[];
  walkinId?: number; // set when converting a walk-in into a monthly member
}) {
  if (!input.consent) throw new RegistrationError("Data privacy consent is required before enrollment.");
  if (!lastName(input.fullName)) throw new RegistrationError("Please enter the member's full name.");
  if (!input.fingers.some((f) => f.fingerIndex === 0)) throw new RegistrationError("The primary fingerprint is required.");

  const password = defaultPassword(input.fullName);
  const passwordHash = await bcrypt.hash(password, 12); // hashed; the plain default is shown to the admin once
  const term = newTerm(todayManila());

  // Two registrations at the same moment could pick the same username: the UNIQUE constraint stops it, so retry.
  for (let attempt = 1; ; attempt++) {
    try {
      return await withTx(async (q) => {
        const taken = await users.usernamesStartingWith(baseUsername(input.fullName), q);
        const username = pickUsername(baseUsername(input.fullName), taken);
        const userId = await users.insertMember({ fullName: input.fullName, username, passwordHash, consentVersion: CONSENT_VERSION }, q);
        for (const f of input.fingers) await fingerprints.upsertTemplate(userId, f.fingerIndex, f.template, q);
        await memberships.insertMembership(userId, term.start, term.expiry, q);
        await payments.insertPayment({ userId, type: "monthly", amount: MEMBERSHIP_PRICE }, q);
        await streaks.ensureStreakRow(userId, q);
        if (input.walkinId) await markWalkinConverted(input.walkinId, userId, q);
        return { userId, username, password, startDate: term.start, expiryDate: term.expiry };
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505" && attempt < 3) continue; // unique violation: username race
      throw e;
    }
  }
}

export async function registerWalkin(input: { fullName: string; amount: number }) {
  const today = todayManila();
  return withTx(async (q) => {
    const id = await walkins.insertWalkin(input.fullName, today, input.amount, q);
    await payments.insertPayment({ walkinId: id, type: "walkin", amount: input.amount }, q);
    return { walkinId: id, sessionDate: today };
  });
}
