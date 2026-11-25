// npm run restore -- <backup.json>  -> loads a backup into the database in RESTORE_DATABASE_URL.
// Safety: you must name the target explicitly, run `npm run migrate` on it first, and it must have no users.
import { readFileSync } from "node:fs";
import { connect, existingTables } from "./db-common";

type Cell = { $b64: string } | string | number | boolean | null;

async function main() {
  const file = process.argv[2];
  const target = process.env.RESTORE_DATABASE_URL;
  if (!file || !target) throw new Error("Usage: set RESTORE_DATABASE_URL, then: npm run restore -- <backup.json>");
  const backup = JSON.parse(readFileSync(file, "utf8")) as { tables: Record<string, Record<string, Cell>[]> };
  const c = await connect(target);
  try {
    const tables = await existingTables(c);
    const users = Number((await c.query("SELECT count(*) AS n FROM users")).rows[0].n);
    if (users > 0) throw new Error("The target database already has users. Restore only into an empty, migrated database.");
    await c.query("BEGIN");
    try {
      for (const t of tables) {
        for (const row of backup.tables[t] ?? []) {
          const cols = Object.keys(row);
          const values = cols.map((k) => {
            const v = row[k];
            return v && typeof v === "object" ? Buffer.from(v.$b64, "base64") : v;
          });
          const names = cols.map((k) => `"${k}"`).join(",");
          const marks = cols.map((_, i) => `$${i + 1}`).join(",");
          await c.query(`INSERT INTO ${t} (${names}) VALUES (${marks})`, values);
        }
        // keep the id counters ahead of the restored ids
        const hasId = await c.query(
          "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'",
          [t],
        );
        if (hasId.rowCount) {
          await c.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT max(id) FROM ${t}), 0) + 1, false)`);
        }
        console.log(`${t}: ${(backup.tables[t] ?? []).length} row(s)`);
      }
      await c.query("COMMIT");
      console.log("Restore complete.");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    }
  } finally {
    await c.end();
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
