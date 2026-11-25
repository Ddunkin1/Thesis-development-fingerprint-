// The activity log: records sensitive actions so the gym (and the study) can see who did what.
import * as audit from "@/data/audit";
import type { Session } from "@/lib/session";
import { MANILA_TZ } from "@/lib/time";

export const ACTIONS = {
  "member.register": "Registered a member",
  "member.renew": "Renewed a membership",
  "member.rename": "Changed a member's name",
  "member.reset_password": "Reset a member's password",
  "member.delete": "Deleted a member",
  "member.export": "Exported the member list",
  "fingerprint.enroll": "Enrolled a fingerprint",
  "fingerprint.withdraw": "Removed fingerprints (consent withdrawn)",
  "attendance.manual": "Manual check-in or check-out",
  "walkin.log": "Logged a walk-in",
  "pin.set": "Set or changed the PIN",
  "pin.failed": "Wrong PIN entered",
  // older entries, from before the app had a single front-desk account
  "staff.create": "Added a staff account",
  "staff.reset_password": "Reset a staff password",
  "staff.delete": "Removed a staff account",
  "kiosk.start": "Locked the screen as kiosk",
  "kiosk.exit": "Unlocked the kiosk",
  "kiosk.exit_failed": "Failed attempt to unlock the kiosk",
} as const;

export type Action = keyof typeof ACTIONS;

/** Never lets a logging problem undo or hide the action itself: a failure is printed to the server log. */
export async function record(actor: Pick<Session, "uid" | "name"> | null, action: Action, target?: string, detail?: string) {
  try {
    await audit.insertAudit({ actorId: actor?.uid ?? null, actorName: actor?.name ?? "Unknown", action, target, detail });
  } catch (e) {
    console.error(`activity log failed (${action}):`, (e as Error).message);
  }
}

export async function activityTable() {
  const when = new Intl.DateTimeFormat("en-PH", { timeZone: MANILA_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const rows = await audit.latestAudit();
  return {
    headers: ["When", "Who", "What", "About", "Details"],
    rows: rows.map((r) => [when.format(r.at), r.actor_name, ACTIONS[r.action as Action] ?? r.action, r.target ?? "", r.detail ?? ""]),
  };
}
