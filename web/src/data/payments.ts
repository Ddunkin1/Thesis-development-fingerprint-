// Data-access layer for payments (monthly registrations/renewals and walk-in fees).
import { query, type Q } from "@/lib/db";

export async function insertPayment(
  p: { userId?: number; walkinId?: number; type: "monthly" | "walkin"; amount: number; note?: string },
  q: Q = query,
) {
  await q("INSERT INTO payments (user_id, walkin_id, type, amount, note) VALUES ($1, $2, $3, $4, $5)", [
    p.userId ?? null,
    p.walkinId ?? null,
    p.type,
    p.amount,
    p.note ?? null,
  ]);
}

/** Net money a member has paid so far (payments minus refunds). */
export async function netPaidBy(userId: number, q: Q = query): Promise<number> {
  const rows = await q<{ s: string }>("SELECT COALESCE(sum(amount), 0) AS s FROM payments WHERE user_id = $1", [userId]);
  return Number(rows[0].s);
}

/** Stamp the member's name on their payments so the records stay readable after the account is deleted. */
export async function labelPaymentsOf(userId: number, label: string, q: Q = query) {
  await q("UPDATE payments SET note = COALESCE(note || ' | ', '') || $2 WHERE user_id = $1", [userId, label]);
}
