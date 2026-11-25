// POST /api/admin/members/:id/manual-checkin {reason} -> front-desk fallback when a finger cannot be read.
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { record } from "@/services/audit-service";
import { ManualCheckInError, manualCheckIn } from "@/services/checkin-service";

const Body = z.object({ reason: z.string().trim().min(5, "Write a short reason (at least 5 characters).").max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id)) return json({ error: "Invalid member." }, 400);
  if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
  try {
    const r = await manualCheckIn(id, parsed.data.reason, auth.session.uid);
    if (r.status !== "checked_in" && r.status !== "checked_out")
      return json({ error: r.status === "already" ? (r.message ?? "Already recorded today.") : "Nothing was recorded." }, 409);
    await record(auth.session, "attendance.manual", r.name, `${r.status === "checked_in" ? "Check-in" : "Check-out"}: ${parsed.data.reason}`);
    return json({ ok: true, status: r.status, time: r.time, name: r.name });
  } catch (e) {
    if (e instanceof ManualCheckInError) return json({ error: e.message }, 400);
    console.error("manual check-in failed:", (e as Error).message);
    return json({ error: "Could not save. Please try again." }, 500);
  }
}
