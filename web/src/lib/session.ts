// Session handling: a signed JWT (HS256) stored in an httpOnly cookie.
// Only uses `jose`, so it also works inside proxy.ts (which must not use Node-only modules).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "chaq_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export type Role = "admin" | "member";

export interface Session {
  uid: number;
  role: Role;
  name: string;
  mustChange: boolean; // true until the user replaces the default password
}

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ role: s.role, name: s.name, mc: s.mustChange })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.uid))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return {
      uid: Number(payload.sub),
      role: payload.role as Role,
      name: String(payload.name ?? ""),
      mustChange: Boolean(payload.mc),
    };
  } catch {
    return null; // expired or tampered
  }
}

/** Options used for every Set-Cookie of the session. */
export const cookieOptions = {
  httpOnly: true, // not readable from JavaScript -> protects against XSS token theft
  sameSite: "lax" as const, // blocks cross-site POSTs (CSRF)
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
