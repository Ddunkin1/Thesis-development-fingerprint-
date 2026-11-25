// Data-access layer for fingerprint templates (binary templates only - never images).
// Templates are encrypted on the way into the database and decrypted on the way out, here and nowhere else.
import { query, type Q } from "@/lib/db";
import { env } from "@/lib/env";
import { decryptTemplate, encryptTemplate, parseKey } from "@/lib/template-crypto";

export interface TemplateRow {
  user_id: string; // BIGINT comes back from pg as a string
  finger_index: number;
  template: Buffer;
}

/** Every stored template, decrypted, used by the bridge to build its in-memory matching database. */
export async function listAllTemplates(): Promise<TemplateRow[]> {
  const key = parseKey(env.templateKey);
  const rows = await query<TemplateRow>("SELECT user_id, finger_index, template FROM fingerprints ORDER BY user_id, finger_index");
  // A wrong key or a damaged row throws: the bridge then keeps the templates it already has.
  return rows.map((r) => ({ ...r, template: decryptTemplate(r.template, Number(r.user_id), r.finger_index, key) }));
}

/** Insert or replace one finger for a member (re-enrollment overwrites). */
export async function upsertTemplate(userId: number, fingerIndex: number, template: Buffer, q: Q = query) {
  const sealed = encryptTemplate(template, userId, fingerIndex, parseKey(env.templateKey));
  await q(
    `INSERT INTO fingerprints (user_id, finger_index, template) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, finger_index) DO UPDATE SET template = EXCLUDED.template`,
    [userId, fingerIndex, sealed],
  );
}

/** Removes every stored finger of one member (consent withdrawn). Returns how many were removed. */
export async function deleteTemplatesOf(userId: number, q: Q = query): Promise<number> {
  const rows = await q("DELETE FROM fingerprints WHERE user_id = $1 RETURNING id", [userId]);
  return rows.length;
}

export async function countTemplatesOf(userId: number): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM fingerprints WHERE user_id = $1", [userId]);
  return Number(rows[0].n);
}
