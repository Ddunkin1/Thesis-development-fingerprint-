// GET /api/admin/leaderboard?month=YYYY-MM -> top streaks of the month (members who opted out are excluded).
import { requireRole, json } from "@/lib/guard";
import { leaderboard } from "@/services/streak-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  return json(await leaderboard(month));
}
