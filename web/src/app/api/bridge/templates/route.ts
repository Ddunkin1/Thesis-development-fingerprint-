// GET /api/bridge/templates - used ONLY by the C# Fingerprint Bridge.
// Protected by the BRIDGE_API_KEY header (not by a user session). Returns all templates as base64.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { listAllTemplates } from "@/data/fingerprints";
import { env } from "@/lib/env";

function keyOk(provided: string | null): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(env.bridgeApiKey);
  return a.length === b.length && timingSafeEqual(a, b); // constant-time compare
}

export async function GET(req: Request) {
  if (!keyOk(req.headers.get("x-bridge-api-key"))) {
    return NextResponse.json({ error: "Invalid bridge key." }, { status: 401 });
  }
  const rows = await listAllTemplates();
  return NextResponse.json({
    templates: rows.map((r) => ({
      userId: Number(r.user_id),
      fingerIndex: r.finger_index,
      template: r.template.toString("base64"),
    })),
  });
}
