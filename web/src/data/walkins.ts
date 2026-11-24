// Data-access layer for walk-in sessions (one-day visitors without an account).
import { query, type Q } from "@/lib/db";

export async function insertWalkin(fullName: string, sessionDate: string, amount: number, q: Q = query): Promise<number> {
  const rows = await q<{ id: string }>(
    "INSERT INTO walkin_sessions (full_name, session_date, amount) VALUES ($1, $2, $3) RETURNING id",
    [fullName, sessionDate, amount],
  );
  return Number(rows[0].id);
}
