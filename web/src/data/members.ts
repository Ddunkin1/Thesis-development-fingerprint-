// Data-access layer for monthly members (users with role = 'member' joined with their latest membership).
import { query, type Q } from "@/lib/db";

export interface MemberRow {
  id: string;
  full_name: string;
  username: string;
  created_at: string;
  start_date: string | null;
  expiry_date: string | null;
  fingers: string;
  streak: number;
  paid: string;
  consent_given: boolean;
  consent_at: Date | null;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export async function listMembers(search: string, q: Q = query): Promise<MemberRow[]> {
  const pattern = "%" + escapeLike(search.trim()) + "%";
  return q<MemberRow>(
    `SELECT u.id, u.full_name, u.username, u.created_at, u.consent_given, u.consent_at,
            m.start_date, m.expiry_date,
            (SELECT count(*) FROM fingerprints f WHERE f.user_id = u.id) AS fingers,
            COALESCE(s.current_streak, 0) AS streak,
            (SELECT COALESCE(sum(amount), 0) FROM payments p WHERE p.user_id = u.id) AS paid
       FROM users u
       LEFT JOIN LATERAL (SELECT start_date, expiry_date FROM memberships
                           WHERE user_id = u.id ORDER BY expiry_date DESC LIMIT 1) m ON true
       LEFT JOIN streaks s ON s.user_id = u.id
      WHERE u.role = 'member' AND ($1 = '' OR u.full_name ILIKE $2 OR u.username ILIKE $2)
      ORDER BY u.full_name`,
    [search.trim(), pattern],
  );
}

export interface MemberBasic {
  id: string;
  full_name: string;
  username: string;
  consent_given: boolean;
  expiry_date: string | null;
}

/** One member plus the expiry of their latest membership (null if the id is not a member). */
export async function findMember(userId: number, q: Q = query): Promise<MemberBasic | null> {
  const rows = await q<MemberBasic>(
    `SELECT u.id, u.full_name, u.username, u.consent_given,
            (SELECT expiry_date FROM memberships WHERE user_id = u.id ORDER BY expiry_date DESC LIMIT 1) AS expiry_date
       FROM users u WHERE u.id = $1 AND u.role = 'member'`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function updateName(userId: number, fullName: string) {
  await query("UPDATE users SET full_name = $1 WHERE id = $2 AND role = 'member'", [fullName, userId]);
}

export async function deleteMember(userId: number, q: Q = query) {
  // Cascades to fingerprints, memberships, attendance, streaks and badges. Payments are kept (user_id set to NULL).
  await q("DELETE FROM users WHERE id = $1 AND role = 'member'", [userId]);
}

/** Lock and read the newest membership row for renewal. */
export async function latestMembershipForUpdate(userId: number, q: Q) {
  const rows = await q<{ id: string; start_date: string; expiry_date: string }>(
    "SELECT id, start_date, expiry_date FROM memberships WHERE user_id = $1 ORDER BY expiry_date DESC LIMIT 1 FOR UPDATE",
    [userId],
  );
  return rows[0] ?? null;
}

export async function updateMembership(id: string, start: string, expiry: string, q: Q) {
  await q("UPDATE memberships SET start_date = $1, expiry_date = $2, status = 'active' WHERE id = $3", [start, expiry, id]);
}

export async function markWalkinConverted(walkinId: number, userId: number, q: Q = query) {
  await q("UPDATE walkin_sessions SET converted_user_id = $1 WHERE id = $2", [userId, walkinId]);
}

export async function recentWalkins(sinceDate: string) {
  return query<{ id: string; full_name: string; session_date: string; amount: string; converted_user_id: string | null }>(
    "SELECT id, full_name, session_date, amount, converted_user_id FROM walkin_sessions WHERE session_date >= $1 ORDER BY id DESC",
    [sinceDate],
  );
}
