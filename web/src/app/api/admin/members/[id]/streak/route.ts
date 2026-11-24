// GET /api/admin/members/:id/streak -> week tiles, streak numbers and badges for one member.
import { requireRole, json } from "@/lib/guard";
import { getStreakView } from "@/services/streak-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  return json(await getStreakView(id));
}
