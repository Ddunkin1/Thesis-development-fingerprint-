// /api/admin/members/:id/fingerprint
//   PUT    {fingerIndex, template(base64), consent?} -> (re-)enroll one finger (consent needed again after withdrawal)
//   DELETE                                           -> consent withdrawn: remove every stored fingerprint
import { requirePin } from "@/lib/pin-guard";
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { record } from "@/services/audit-service";
import { MemberError, saveFingerprint, withdrawFingerprints } from "@/services/member-service";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ fingerIndex: z.number().int().min(0).max(1), template: z.string().min(100).max(8000), consent: z.boolean().optional() });

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const refused = await requirePin(req, auth.session);
  if (refused) return refused;
  const id = Number((await params).id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return json({ error: "Invalid fingerprint data." }, 400);
  try {
    const m = await saveFingerprint(id, parsed.data.fingerIndex, Buffer.from(parsed.data.template, "base64"), parsed.data.consent);
    await record(auth.session, "fingerprint.enroll", m?.username, parsed.data.fingerIndex === 0 ? "Primary finger" : "Backup finger");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 400);
    throw e;
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const refused = await requirePin(req, auth.session);
  if (refused) return refused;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  try {
    const r = await withdrawFingerprints(id);
    await record(auth.session, "fingerprint.withdraw", r.username, `${r.removed} removed`);
    return json({ ok: true, removed: r.removed });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 404);
    throw e;
  }
}
