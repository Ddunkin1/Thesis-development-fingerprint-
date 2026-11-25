// Helpers for API routes: every protected route calls requireRole(...) first.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findById } from "@/data/users";
import {
  RENEW_AFTER_SECONDS, SESSION_COOKIE, UNLOCK_COOKIE, cookieOptionsFor, signSession, unlockEndsAt, verifySession,
  type Role, type Session,
} from "./session";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** True when a state-changing request comes from another website (extra CSRF layer on top of SameSite=Lax). */
export function badOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return false;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  return !!origin && !!host && new URL(origin).host !== host;
}

/** Keeps the front desk signed in: a day-old admin cookie is replaced by a fresh 30-day one. */
async function renewIfOld(s: Session) {
  if (s.role !== "admin" || !s.issuedAt || Date.now() / 1000 - s.issuedAt < RENEW_AFTER_SECONDS) return;
  (await cookies()).set(SESSION_COOKIE, await signSession(s), cookieOptionsFor(s.role));
}

/** Returns the session if the caller has the role, otherwise a ready-made error response. */
export async function requireRole(
  req: Request,
  role: Role,
): Promise<{ session: Session; error?: undefined } | { session?: undefined; error: NextResponse }> {
  const s = await getSession();
  if (!s) return { error: json({ error: "Not signed in." }, 401) };
  if (s.role !== role) return { error: json({ error: "You do not have permission." }, 403) };
  if (s.mustChange) return { error: json({ error: "Password change required." }, 403) };
  if (badOrigin(req)) return { error: json({ error: "Bad origin." }, 403) };
  if (s.role === "admin") {
    const user = await findById(s.uid);
    if (user?.role !== "admin") return { error: json({ error: "This account is no longer active. Sign in again." }, 401) };
  }
  await renewIfOld(s);
  return { session: s };
}

/** Was the PIN typed in the last few minutes? (For looking at income, reports, the activity log and exports.) */
export async function isUnlocked(s: Session): Promise<boolean> {
  return (await unlockEndsAt((await cookies()).get(UNLOCK_COOKIE)?.value, s.uid)) !== null;
}

/** Ready-made refusal for a page of private figures while the PIN has not been typed. */
export async function requireUnlocked(s: Session): Promise<NextResponse | null> {
  return (await isUnlocked(s)) ? null : json({ error: "Enter your PIN to see this.", code: "pin_locked" }, 403);
}
