// PUT /api/admin/members/:id/fingerprint {fingerIndex, template(base64)} -> (re-)enroll one finger.
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { MemberError, saveFingerprint } from "@/services/member-service";

const Body = z.object({ fingerIndex: z.number().int().min(0).max(1), template: z.string().min(100).max(8000) });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !parsed.success) return json({ error: "Invalid fingerprint data." }, 400);
  try {
    await saveFingerprint(id, parsed.data.fingerIndex, Buffer.from(parsed.data.template, "base64"));
    return json({ ok: true });
  } catch (e) {
    if (e instanceof MemberError) return json({ error: e.message }, 404);
    throw e;
  }
}
