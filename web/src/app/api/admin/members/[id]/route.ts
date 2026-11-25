// /api/admin/members/:id
//   PATCH  {fullName}  -> edit name (username stays the same)
//   DELETE {refund?}   -> delete the member and all their data; refund > 0 records the money returned.  NEEDS THE PIN
import { requirePin } from "@/lib/pin-guard";
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { record } from "@/services/audit-service";
import { MemberError, removeMember, renameMember } from "@/services/member-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const parsed = z.object({ fullName: z.string().trim().min(2).max(100) }).safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return json({ error: "Enter a valid name." }, 400);
  const fullName = parsed.data.fullName.replace(/\s+/g, " ");
  await renameMember(id, fullName);
  await record(auth.session, "member.rename", `member #${id}`, fullName);
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const refused = await requirePin(req, auth.session);
  if (refused) return refused;
  const id = Number((await params).id);
  const body = z.object({ refund: z.number().min(0).max(1_000_000).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!Number.isInteger(id) || !body.success) return json({ error: "Invalid request." }, 400);
  try {
    const refund = body.data.refund ?? 0;
    const gone = await removeMember(id, refund);
    await record(auth.session, "member.delete", gone.username, refund ? `Refund recorded: ${refund}` : "No refund");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 400);
    throw e;
  }
}
