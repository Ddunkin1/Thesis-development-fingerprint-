// Shared helpers for the backup / restore scripts.
import { Client, types } from "pg";

types.setTypeParser(1082, (v) => v); // keep DATE values as 'YYYY-MM-DD' (no time-zone shifting)

/** Tables in an order that is safe to insert into (parents first). */
export const TABLES = [
  "users", "walkin_sessions", "fingerprints", "memberships", "attendance",
  "payments", "streaks", "badges", "scan_log", "audit_log",
];

export async function connect(url?: string) {
  const u = url || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL not set");
  // Some networks have flaky routes to Neon: one attempt can time out while the next one works.
  for (let attempt = 1; ; attempt++) {
    const c = new Client({ connectionString: u, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10_000 });
    try {
      await c.connect();
      return c;
    } catch (e) {
      if (attempt >= 4) throw e;
    }
  }
}

export async function existingTables(c: Client) {
  const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  const have = new Set(r.rows.map((x) => x.tablename as string));
  return TABLES.filter((t) => have.has(t));
}
