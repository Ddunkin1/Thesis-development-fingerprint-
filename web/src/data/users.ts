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
  u: { fullName: string; username: string; passwordHash: string; consent: boolean },
  q: Q = query,
): Promise<number> {
  const rows = await q<{ id: string }>(
    `INSERT INTO users (full_name, username, password_hash, role, must_change_password, consent_given)
     VALUES ($1, $2, $3, 'member', true, $4) RETURNING id`,
    [u.fullName, u.username, u.passwordHash, u.consent],
  );
  return Number(rows[0].id);
}
