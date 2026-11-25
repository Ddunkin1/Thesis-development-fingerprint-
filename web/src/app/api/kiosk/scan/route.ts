// POST /api/kiosk/scan {proof} -> the check-in screen forwards the bridge's SIGNED result; the server applies the
// rules (membership status, duplicate check-in, check-out) and writes attendance / scan_log.
import { z } from "zod";
import { requireRole, json } from "@/lib/guard";
import { env } from "@/lib/env";
import { verifyScanProof } from "@/lib/scan-proof";
import { handleScan } from "@/services/checkin-service";

export async function POST(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const parsed = z.object({ proof: z.string().min(40).max(600) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid scan." }, 400);
  const check = verifyScanProof(parsed.data.proof, env.bridgeApiKey);
  if (!check.ok) {
    console.warn(`kiosk scan rejected: ${check.reason} proof`);
    return json({ error: check.reason, reason: check.reason }, 400);
  }
  try {
    const outcome = await handleScan(check.result.userId, check.result.nonce);
    if (outcome.status === "replayed") return json({ error: "This scan was already used.", reason: "replayed" }, 409);
    return json(outcome);
  } catch (e) {
    console.error("kiosk scan failed:", (e as Error).message);
    return json({ error: "Could not record the scan. Please try again." }, 500);
  }
}
