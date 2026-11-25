// /api/admin/pin/unlock
//   POST (header x-admin-pin) -> show private figures for 5 minutes      DELETE -> hide them again now
import { requireRole, json } from "@/lib/guard";
import { requirePin } from "@/lib/pin-guard";
import { UNLOCK_COOKIE, UNLOCK_MAX_AGE, cookieOptions, signUnlock } from "@/lib/session";

export async function POST(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const refused = await requirePin(req, auth.session);
  if (refused) return refused;
  const res = json({ ok: true });
  res.cookies.set(UNLOCK_COOKIE, await signUnlock(auth.session.uid), { ...cookieOptions, maxAge: UNLOCK_MAX_AGE });
  return res;
}

export async function DELETE(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const res = json({ ok: true });
  res.cookies.set(UNLOCK_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
