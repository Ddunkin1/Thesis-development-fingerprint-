// POST /api/auth/change-password { current, next } -> required on first login with a default password.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/guard";
import { changePassword } from "@/services/auth-service";
import { SESSION_COOKIE, cookieOptionsFor, signSession } from "@/lib/session";

const Body = z.object({ current: z.string().min(1), next: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fill in both fields." }, { status: 400 });

  const problem = await changePassword(s.uid, parsed.data.current, parsed.data.next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Re-issue the cookie with mustChange=false so the user can proceed.
  const res = NextResponse.json({ ok: true, role: s.role });
  res.cookies.set(SESSION_COOKIE, await signSession({ ...s, mustChange: false }), cookieOptionsFor(s.role));
  return res;
}
