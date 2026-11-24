// POST /api/admin/members/:id/renew -> extend the membership by 30 days and record the fixed fee as a payment.
import { requireRole, json } from "@/lib/guard";
import { MemberError, renewMember } from "@/services/member-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  try {
    return json({ ok: true, ...(await renewMember(id)) });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 400);
    throw e;
  }
}
