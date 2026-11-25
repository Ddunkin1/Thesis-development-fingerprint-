// npm run backup  -> writes every table to a JSON file in ../../backups (OUTSIDE the git repository).
// The file holds personal data (names, password hashes, fingerprint templates): keep it private.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { connect, existingTables } from "./db-common";

async function main() {
  const c = await connect();
  const data: Record<string, unknown[]> = {};
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"); // one consistent snapshot
  for (const t of await existingTables(c)) {
    const rows = (await c.query(`SELECT * FROM ${t}`)).rows;
    data[t] = rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Buffer.isBuffer(v) ? { $b64: v.toString("base64") } : v])),
    );
  }
  await c.query("COMMIT");
  await c.end();
  const dir = resolve(process.cwd(), "..", "..", "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `chaq-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), tables: data }));
  console.log(`Backup written: ${file}`);
  console.log(Object.entries(data).map(([t, r]) => `${t}: ${r.length}`).join(", "));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
