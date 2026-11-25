// /api/admin/pin
//   GET               -> is a PIN set, and until when are private figures unlocked?
//   PUT {password,pin} -> set, change or recover the PIN (needs the admin password)
import { cookies } from "next/headers";
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { UNLOCK_COOKIE, unlockEndsAt } from "@/lib/session";
import { hasPin, setPin } from "@/services/pin-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const until = await unlockEndsAt((await cookies()).get(UNLOCK_COOKIE)?.value, auth.session.uid);
  return json({ isSet: await hasPin(auth.session.uid), unlockedUntil: until });
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const parsed = z.object({ password: z.string().min(1).max(200), pin: z.string().max(10) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter the admin password and a 4-digit PIN." }, 400);
  const problem = await setPin(auth.session, parsed.data.password, parsed.data.pin);
  return problem ? json({ error: problem }, 400) : json({ ok: true });
}
