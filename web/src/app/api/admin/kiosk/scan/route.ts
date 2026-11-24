// POST /api/admin/kiosk/scan {userId: number | null}
// The kiosk page identifies the finger through the bridge, then reports the result here so the server
// can apply the rules (membership status, duplicate check-in, check-out) and write attendance / scan_log.
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { handleScan } from "@/services/checkin-service";

export async function POST(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const parsed = z.object({ userId: z.number().int().positive().nullable() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid scan." }, 400);
  try {
    return json(await handleScan(parsed.data.userId));
  } catch (e) {
    console.error("kiosk scan failed:", (e as Error).message);
    return json({ error: "Could not record the scan. Please try again." }, 500);
  }
}
