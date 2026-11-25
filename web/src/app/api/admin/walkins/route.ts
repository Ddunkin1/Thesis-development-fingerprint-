// /api/admin/walkins
//   GET  -> today's walk-ins (so one can be converted to a monthly member)
//   POST -> log a one-session walk-in (name + fee). No account, no fingerprint.
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { record } from "@/services/audit-service";
import { registerWalkin } from "@/services/registration-service";
import { listRecentWalkins } from "@/services/member-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  return json({ walkins: await listRecentWalkins() });
}

const Body = z.object({ fullName: z.string().trim().min(2).max(100), amount: z.number().min(0).max(1_000_000) });

export async function POST(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter the visitor name and the amount paid." }, 400);
  try {
    const r = await registerWalkin({ fullName: parsed.data.fullName.replace(/\s+/g, " "), amount: parsed.data.amount });
    await record(auth.session, "walkin.log", parsed.data.fullName, `Paid ${parsed.data.amount}`);
    return json({ ok: true, ...r }, 201);
  } catch (e) {
    console.error("registerWalkin failed:", (e as Error).message);
    return json({ error: "Could not save the walk-in. Please try again." }, 500);
  }
}
