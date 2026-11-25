// POST /api/auth/logout -> clears the session cookie.
import { NextResponse } from "next/server";
import { SESSION_COOKIE, UNLOCK_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(UNLOCK_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
