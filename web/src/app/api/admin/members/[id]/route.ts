// /api/admin/members/:id
//   PATCH  {fullName}  -> edit name (username stays the same)
//   DELETE {refund?}   -> delete the member and all their data; refund > 0 records the money returned
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { MemberError, removeMember, renameMember } from "@/services/member-service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const parsed = z.object({ fullName: z.string().trim().min(2).max(100) }).safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return json({ error: "Enter a valid name." }, 400);
  await renameMember(id, parsed.data.fullName.replace(/\s+/g, " "));
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const body = z.object({ refund: z.number().min(0).max(1_000_000).optional() }).safeParse(await req.json().catch(() => ({})));
  if (!Number.isInteger(id) || !body.success) return json({ error: "Invalid request." }, 400);
  try {
    await removeMember(id, body.data.refund ?? 0);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 400);
    throw e;
  }
}
