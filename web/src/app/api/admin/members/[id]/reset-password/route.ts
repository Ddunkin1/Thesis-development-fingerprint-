// POST /api/admin/members/:id/reset-password -> back to the default (lastname + "Chaq"), forced change at next login.
import { requireRole, json } from "@/lib/guard";
import { MemberError, resetPassword } from "@/services/member-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  try {
    return json({ ok: true, ...(await resetPassword(id)) });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 404);
    throw e;
  }
}
