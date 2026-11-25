// Data-access layer for the activity log (who did what, and when).
import { query, type Q } from "@/lib/db";

export interface AuditRow {
  at: Date;
  actor_name: string;
  action: string;
  target: string | null;
  detail: string | null;
}

export async function insertAudit(
  a: { actorId: number | null; actorName: string; action: string; target?: string; detail?: string },
  q: Q = query,
) {
  await q("INSERT INTO audit_log (actor_id, actor_name, action, target, detail) VALUES ($1, $2, $3, $4, $5)", [
    a.actorId, a.actorName, a.action, a.target ?? null, a.detail ?? null,
  ]);
}

export async function latestAudit(limit = 500) {
  return query<AuditRow>("SELECT at, actor_name, action, target, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT $1", [limit]);
}
