// POST /api/auth/login  { username, password }  -> sets the httpOnly session cookie.
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/services/auth-service";
import { SESSION_COOKIE, cookieOptionsFor, signSession } from "@/lib/session";
import { allow, reset } from "@/lib/rate-limit";

const Body = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });
const WINDOW = 15 * 60 * 1000;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  const { username, password } = parsed.data;

  // Rate limit per 15 minutes: 5 tries per username+IP, 30 per IP, and 15 per username overall
  // (the per-username cap still protects an account if someone fakes their IP header).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const userKey = `login:${ip}:${username.toLowerCase()}`;
  if (!allow(`login-ip:${ip}`, 30, WINDOW) || !allow(userKey, 5, WINDOW) || !allow(`login-user:${username.toLowerCase()}`, 15, WINDOW)) {
    return NextResponse.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }

  const session = await authenticate(username, password);
  if (!session) return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });

  reset(userKey);
  reset(`login-user:${username.toLowerCase()}`);
  const res = NextResponse.json({ ok: true, role: session.role, mustChange: session.mustChange });
  res.cookies.set(SESSION_COOKIE, await signSession(session), cookieOptionsFor(session.role));
  return res;
}
