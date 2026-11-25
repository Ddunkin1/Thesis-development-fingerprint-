// POST /api/admin/members/:id/reset-password -> back to the default (lastname + "Chaq"), forced change at next login.
import { requirePin } from "@/lib/pin-guard";
import { requireRole, json } from "@/lib/guard";
import { record } from "@/services/audit-service";
import { MemberError, resetPassword } from "@/services/member-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const refused = await requirePin(req, auth.session);
  if (refused) return refused;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  try {
    const r = await resetPassword(id);
    await record(auth.session, "member.reset_password", r.username);
    return json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 404);
    throw e;
  }
}
