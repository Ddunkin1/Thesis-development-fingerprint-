// Data-access layer for memberships.
import { query, type Q } from "@/lib/db";

export async function insertMembership(userId: number, start: string, expiry: string, q: Q = query) {
  await q(
    "INSERT INTO memberships (user_id, type, start_date, expiry_date, status) VALUES ($1, 'monthly', $2, $3, 'active')",
    [userId, start, expiry],
  );
}
