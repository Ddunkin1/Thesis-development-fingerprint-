// POST /api/admin/members/:id/renew -> extend the membership by 30 days and record the fixed fee as a payment.
import { requirePin } from "@/lib/pin-guard";
import { requireRole, json } from "@/lib/guard";
import { record } from "@/services/audit-service";
import { MemberError, renewMember } from "@/services/member-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const refused = await requirePin(req, auth.session);
  if (refused) return refused;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  try {
    const r = await renewMember(id);
    await record(auth.session, "member.renew", `member #${id}`, `New expiry ${r.expiryDate}`);
    return json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 400);
    throw e;
  }
}
