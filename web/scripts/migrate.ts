// Applies db/migrations/*.sql in order, once each, tracked in schema_migrations.
// Uses the DIRECT (unpooled) Neon URL, as recommended for schema changes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL not set");
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  await c.connect();
  await c.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  );
  const done = new Set((await c.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  const dir = join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) { console.log(`skip    ${f}`); continue; }
    await c.query("BEGIN");
    try {
      await c.query(readFileSync(join(dir, f), "utf8"));
      await c.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
      await c.query("COMMIT");
      console.log(`applied ${f}`);
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    }
  }
  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
