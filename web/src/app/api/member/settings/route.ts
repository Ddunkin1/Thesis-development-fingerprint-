// PATCH /api/member/settings { leaderboardOptOut: boolean } -> show or hide the member on the leaderboard.
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { setOptOut } from "@/services/member-portal-service";

export async function PATCH(req: Request) {
  const auth = await requireRole(req, "member");
  if (auth.error) return auth.error;
  const body = z.object({ leaderboardOptOut: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "Invalid setting." }, 400);
  await setOptOut(auth.session.uid, body.data.leaderboardOptOut);
  return json({ ok: true });
}
