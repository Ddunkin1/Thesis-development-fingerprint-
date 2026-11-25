// Data-access layer for the users table (SQL only, no business rules).
import { query, type Q } from "@/lib/db";

export interface UserRow {
  id: number;
  full_name: string;
  username: string;
  password_hash: string;
  role: "admin" | "member";
  must_change_password: boolean;
  consent_given: boolean;
  consent_at: Date | null;
  consent_withdrawn_at: Date | null;
  leaderboard_opt_out: boolean;
  admin_pin_hash: string | null;
  created_at: string;
}

export async function findByUsername(username: string): Promise<UserRow | null> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE username = $1", [username.trim().toLowerCase()]);
  return rows[0] ?? null;
}

export async function findById(id: number): Promise<UserRow | null> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function setPassword(id: number, hash: string, mustChange: boolean) {
  await query("UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3", [hash, mustChange, id]);
}

/** All usernames that start with `base` (used to pick cruz2026a when cruz2026 is taken). */
export async function usernamesStartingWith(base: string, q: Q = query): Promise<Set<string>> {
  const rows = await q<{ username: string }>("SELECT username FROM users WHERE username LIKE $1", [base.replace(/[%_]/g, "") + "%"]);
  return new Set(rows.map((r) => r.username));
}

export async function insertMember(
  u: { fullName: string; username: string; passwordHash: string; consentVersion: string },
  q: Q = query,
): Promise<number> {
  const rows = await q<{ id: string }>(
    `INSERT INTO users (full_name, username, password_hash, role, must_change_password, consent_given, consent_at, consent_version)
     VALUES ($1, $2, $3, 'member', true, true, now(), $4) RETURNING id`,
    [u.fullName, u.username, u.passwordHash, u.consentVersion],
  );
  return Number(rows[0].id);
}

export async function setLeaderboardOptOut(userId: number, optOut: boolean) {
  await query("UPDATE users SET leaderboard_opt_out = $2 WHERE id = $1 AND role = 'member'", [userId, optOut]);
}

// ------------------------------------------------------------------ consent

export async function recordConsent(userId: number, version: string, q: Q = query) {
  await q(
    "UPDATE users SET consent_given = true, consent_at = now(), consent_version = $2, consent_withdrawn_at = NULL WHERE id = $1 AND role = 'member'",
    [userId, version],
  );
}

export async function recordConsentWithdrawal(userId: number, q: Q = query) {
  await q("UPDATE users SET consent_given = false, consent_withdrawn_at = now() WHERE id = $1 AND role = 'member'", [userId]);
}

// ------------------------------------------------------------------ front-desk PIN

export async function setAdminPin(userId: number, hash: string) {
  await query("UPDATE users SET admin_pin_hash = $2 WHERE id = $1 AND role = 'admin'", [userId, hash]);
}
