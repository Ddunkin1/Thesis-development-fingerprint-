// npm run encrypt:templates -> encrypts every template that is still stored as plain bytes. Safe to re-run.
// Run it once after `npm run migrate`. It checks that each result decrypts back to the original before saving.
import { connect } from "./db-common";
import { decryptTemplate, encryptTemplate, isEncrypted, parseKey } from "../src/lib/template-crypto";

async function main() {
  const key = parseKey(process.env.TEMPLATE_ENCRYPTION_KEY);
  const c = await connect();
  let done = 0, already = 0;
  await c.query("BEGIN");
  try {
    const rows = (await c.query("SELECT id, user_id, finger_index, template FROM fingerprints ORDER BY id FOR UPDATE")).rows;
    for (const r of rows) {
      const stored = r.template as Buffer;
      const userId = Number(r.user_id);
      if (isEncrypted(stored)) {
        decryptTemplate(stored, userId, r.finger_index, key); // proves the current key is the right one
        already++;
        continue;
      }
      const sealed = encryptTemplate(stored, userId, r.finger_index, key);
      if (!decryptTemplate(sealed, userId, r.finger_index, key).equals(stored)) throw new Error("Self-check failed.");
      await c.query("UPDATE fingerprints SET template = $1 WHERE id = $2", [sealed, r.id]);
      done++;
    }
    await c.query("COMMIT");
    console.log(`Encrypted ${done} template(s); ${already} already encrypted.`);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    await c.end();
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
