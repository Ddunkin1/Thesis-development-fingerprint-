// Session handling: a signed JWT (HS256) stored in an httpOnly cookie.
// Only uses `jose`, so it also works inside proxy.ts (which must not use Node-only modules).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "chaq_session";
export const UNLOCK_COOKIE = "chaq_unlock";
export const SESSION_MAX_AGE = 60 * 60 * 8;             // members: 8 hours
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 30;         // front desk: 30 days, renewed while it is being used
export const RENEW_AFTER_SECONDS = 60 * 60 * 24;        // renew the front-desk cookie once it is a day old
export const UNLOCK_MAX_AGE = 60 * 5;                   // after the PIN, income and reports stay visible for 5 minutes

export type Role = "admin" | "member";

export interface Session {
  uid: number;
  role: Role;
  name: string;
  mustChange: boolean; // true until the user replaces the default password
  issuedAt?: number;   // seconds since 1970
}

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export const maxAgeOf = (role: Role) => (role === "admin" ? ADMIN_MAX_AGE : SESSION_MAX_AGE);

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ role: s.role, name: s.name, mc: s.mustChange })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.uid))
    .setIssuedAt()
    .setExpirationTime(`${maxAgeOf(s.role)}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    // anything that is not a normal sign-in (for example a PIN unlock token) is not a session
    if (payload.kind !== undefined || (payload.role !== "admin" && payload.role !== "member")) return null;
    return {
      uid: Number(payload.sub),
      role: payload.role,
      name: String(payload.name ?? ""),
      mustChange: Boolean(payload.mc),
      issuedAt: payload.iat,
    };
  } catch {
    return null; // expired or tampered
  }
}

/** Proof that the PIN was typed a moment ago, for LOOKING at income, reports, the activity log and exports. */
export async function signUnlock(uid: number): Promise<string> {
  return new SignJWT({ kind: "unlock" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(uid))
    .setIssuedAt()
    .setExpirationTime(`${UNLOCK_MAX_AGE}s`)
    .sign(key());
}

/** Seconds since 1970 when the unlock ends, or null if it is missing, expired or belongs to someone else. */
export async function unlockEndsAt(token: string | undefined, uid: number): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.kind === "unlock" && Number(payload.sub) === uid ? (payload.exp ?? null) : null;
  } catch {
    return null;
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

export const cookieOptionsFor = (role: Role) => ({ ...cookieOptions, maxAge: maxAgeOf(role) });
