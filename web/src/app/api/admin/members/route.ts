// /api/admin/members
//   GET  ?q=search            -> list members with their membership status
//   POST {fullName, consent, fingers[], walkinId?} (the fee is fixed on the server) -> register a monthly member (admin only)
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { RegistrationError, registerMonthlyMember } from "@/services/registration-service";
import { listMembers } from "@/services/member-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return json({ members: await listMembers(q.slice(0, 100)) });
}

const Body = z.object({
  fullName: z.string().trim().min(2).max(100),
  consent: z.literal(true, { error: "Data privacy consent is required." }),
  walkinId: z.number().int().positive().optional(),
  fingers: z
    .array(z.object({ fingerIndex: z.number().int().min(0).max(1), template: z.string().min(100).max(8000) }))
    .min(1)
    .max(2),
});

export async function POST(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, 400);
  const { fullName, fingers, walkinId } = parsed.data;
  try {
    const result = await registerMonthlyMember({
      fullName: fullName.replace(/\s+/g, " "),
      consent: true,
      walkinId,
      fingers: fingers.map((f) => ({ fingerIndex: f.fingerIndex, template: Buffer.from(f.template, "base64") })),
    });
    return json({ ok: true, ...result }, 201);
  } catch (e) {
    if (e instanceof RegistrationError) return json({ error: e.message }, 400);
    console.error("registerMonthlyMember failed:", (e as Error).message);
    return json({ error: "Could not save the member. Please try again." }, 500);
  }
}
