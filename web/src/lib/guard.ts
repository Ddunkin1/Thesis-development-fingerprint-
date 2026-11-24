// Helpers for API routes: every admin route calls requireRole("admin") first.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, type Role, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Returns the session if the caller has the role, otherwise a ready-made error response.
 * Also rejects cross-origin state-changing requests (extra CSRF layer on top of SameSite=Lax).
 */
export async function requireRole(
  req: Request,
  role: Role,
): Promise<{ session: Session; error?: undefined } | { session?: undefined; error: NextResponse }> {
  const s = await getSession();
  if (!s) return { error: json({ error: "Not signed in." }, 401) };
  if (s.role !== role) return { error: json({ error: "You do not have permission." }, 403) };
  if (s.mustChange) return { error: json({ error: "Password change required." }, 403) };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return { error: json({ error: "Bad origin." }, 403) };
  }
  return { session: s };
}
