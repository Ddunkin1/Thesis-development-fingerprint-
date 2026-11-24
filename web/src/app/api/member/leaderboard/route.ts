// GET /api/member/leaderboard -> this month's top 10 (names masked, e.g. "Juan C.") plus the member's own rank.
import { requireRole, json } from "@/lib/guard";
import { getBoard } from "@/services/member-portal-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "member");
  if (auth.error) return auth.error;
  return json(await getBoard(auth.session.uid));
}
