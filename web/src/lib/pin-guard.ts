// For routes that change something important: the PIN travels with the request, every single time.
import { NextResponse } from "next/server";
import { checkPin } from "@/services/pin-service";
import type { Session } from "./session";

export const PIN_HEADER = "x-admin-pin";

export async function requirePin(req: Request, session: Session): Promise<NextResponse | null> {
  const r = await checkPin(session, req.headers.get(PIN_HEADER));
  return r.ok ? null : NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
}
