// Data-access layer for fingerprint templates (binary templates only - never images).
import { query, type Q } from "@/lib/db";

export interface TemplateRow {
  user_id: string; // BIGINT comes back from pg as a string
  finger_index: number;
  template: Buffer;
}

/** Every stored template, used by the bridge to build its in-memory matching database. */
export async function listAllTemplates(): Promise<TemplateRow[]> {
  return query<TemplateRow>("SELECT user_id, finger_index, template FROM fingerprints ORDER BY user_id, finger_index");
}

/** Insert or replace one finger for a member (re-enrollment overwrites). */
export async function upsertTemplate(userId: number, fingerIndex: number, template: Buffer, q: Q = query) {
  await q(
    `INSERT INTO fingerprints (user_id, finger_index, template) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, finger_index) DO UPDATE SET template = EXCLUDED.template`,
    [userId, fingerIndex, template],
  );
}
