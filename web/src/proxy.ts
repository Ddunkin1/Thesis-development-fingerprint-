// Next.js 16 "proxy" (formerly middleware): runs before pages render and routes people by role.
// API routes do their own role checks (requireRole) - this is only the page-level gate.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const go = (p: string) => NextResponse.redirect(new URL(p, req.url));
  const home = s?.role === "admin" ? "/admin" : "/member";

  if (pathname === "/login") return s ? go(s.mustChange ? "/change-password" : home) : NextResponse.next();
  if (!s) return go("/login");
  if (s.mustChange && pathname !== "/change-password") return go("/change-password");
  if (pathname === "/") return go(home);
  if ((pathname.startsWith("/admin") || pathname.startsWith("/kiosk")) && s.role !== "admin") return go(home);
  if (pathname.startsWith("/member") && s.role !== "member") return go(home);
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/change-password", "/admin/:path*", "/kiosk", "/member/:path*"] };
