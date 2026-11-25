// The front-desk PIN. It protects IMPORTANT actions (delete, renew, fingerprint changes, password resets) and
// private figures (income, reports, activity log, exports) on a screen that stays signed in.
// A 4-digit PIN is short, so wrong tries are limited: 5 per 15 minutes.
import bcrypt from "bcryptjs";
import * as users from "@/data/users";
import { allow, reset } from "@/lib/rate-limit";
import { pinProblem } from "@/lib/pin-rules";
import type { Session } from "@/lib/session";
import { record } from "./audit-service";

const WINDOW = 15 * 60 * 1000;

export type PinCode = "pin_not_set" | "pin_required" | "pin_wrong" | "pin_paused";
export type PinResult = { ok: true } | { ok: false; code: PinCode; error: string; status: number };

const no = (code: PinCode, error: string, status = 403): PinResult => ({ ok: false, code, error, status });

export async function hasPin(uid: number) {
  return !!(await users.findById(uid))?.admin_pin_hash;
}

export async function checkPin(session: Session, pin: string | null | undefined): Promise<PinResult> {
  const hash = (await users.findById(session.uid))?.admin_pin_hash;
  if (!hash) return no("pin_not_set", "Set your PIN first (menu: PIN).");
  if (!pin) return no("pin_required", "Enter your PIN.");
  if (!allow(`pin:${session.uid}`, 5, WINDOW)) return no("pin_paused", "Too many wrong PINs. Wait 15 minutes. Check-in keeps working.", 429);
  if (!(await bcrypt.compare(pin, hash))) {
    await record(session, "pin.failed");
    return no("pin_wrong", "Wrong PIN.");
  }
  reset(`pin:${session.uid}`);
  return { ok: true };
}

/** Creating, changing or recovering the PIN always needs the admin PASSWORD. Returns an error text or null. */
export async function setPin(session: Session, password: string, pin: string): Promise<string | null> {
  const problem = pinProblem(pin);
  if (problem) return problem;
  if (!allow(`pin-set:${session.uid}`, 5, WINDOW)) return "Too many attempts. Wait 15 minutes.";
  const user = await users.findById(session.uid);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return "The admin password is incorrect.";
  await users.setAdminPin(session.uid, await bcrypt.hash(pin, 12));
  reset(`pin-set:${session.uid}`);
  reset(`pin:${session.uid}`); // a new PIN starts with a clean count
  await record(session, "pin.set");
  return null;
}
