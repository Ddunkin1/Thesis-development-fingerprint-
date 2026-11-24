// Pure membership rules (no database). Used by registration, renewal, the kiosk and the member list.
import { addDays, diffDays } from "@/lib/time";

export const MEMBERSHIP_DAYS = 30;
export const EXPIRING_SOON_DAYS = 3;

export type MembershipStatus = "active" | "expiring" | "expired";

/** Days left: expiry today -> 0 (still valid today), yesterday -> -1 (expired). */
export function daysLeft(expiry: string, today: string): number {
  return diffDays(today, expiry);
}

export function statusOf(expiry: string, today: string): MembershipStatus {
  const left = daysLeft(expiry, today);
  if (left < 0) return "expired";
  if (left <= EXPIRING_SOON_DAYS) return "expiring";
  return "active";
}

/** New membership: starts today, expires start + 30 days. */
export function newTerm(today: string) {
  return { start: today, expiry: addDays(today, MEMBERSHIP_DAYS) };
}

/** Renewal: not yet expired -> expiry + 30 days; already expired -> today + 30 days. */
export function renewedExpiry(currentExpiry: string, today: string): string {
  return daysLeft(currentExpiry, today) >= 0 ? addDays(currentExpiry, MEMBERSHIP_DAYS) : addDays(today, MEMBERSHIP_DAYS);
}
