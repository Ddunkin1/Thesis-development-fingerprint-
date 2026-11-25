// GET /api/admin/activity -> the latest 500 entries of the activity log (needs the PIN).
import { requireRole, requireUnlocked, json } from "@/lib/guard";
import { activityTable } from "@/services/audit-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const locked = await requireUnlocked(auth.session);
  if (locked) return locked;
  return json(await activityTable());
}
