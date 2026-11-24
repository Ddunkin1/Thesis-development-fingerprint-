// Data-access entry point: one shared node-postgres pool.
// Neon guidance: the app is a long-running Node server (Railway), so `pg` with the
// POOLED connection string (DATABASE_URL) is the right driver. Migrations use the direct URL.
import dns from "node:dns";
import { Pool, types, type QueryResultRow } from "pg";
import { env } from "./env";

dns.setDefaultResultOrder("ipv4first"); // prefer IPv4 (see the retry note in query())

// DATE columns are calendar days in Manila. Keep them as 'YYYY-MM-DD' strings so no time zone
// conversion can shift a day (pg would otherwise build a JS Date in the server's zone).
types.setTypeParser(1082, (v) => v);

/** A function that runs one SQL statement and returns its rows (works for the pool or inside a transaction). */
export type Q = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>;

const g = globalThis as unknown as { __pgPool?: Pool };

function getPool(): Pool {
  if (!g.__pgPool) {
    g.__pgPool = new Pool({
      connectionString: env.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 6_000,
      idleTimeoutMillis: 30_000,
      ssl: { rejectUnauthorized: true },
    });
  }
  return g.__pgPool;
}

const CONNECT_FAILURE = /timeout exceeded when trying to connect|ETIMEDOUT|ECONNRESET|Connection terminated/i;

export const query: Q = async <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) => {
  // Some networks have flaky routes to Neon: a connect attempt can hang while the next works.
  // Fail fast (6 s) and retry, only for connection-level failures (never re-run a statement that executed).
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await getPool().query<T>(text, params);
      return r.rows;
    } catch (e) {
      if (!CONNECT_FAILURE.test((e as Error).message ?? "") || attempt >= 3) throw e;
    }
  }
};

/** Runs `fn` inside one transaction (BEGIN ... COMMIT, or ROLLBACK on error). */
export async function withTx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  let client;
  for (let attempt = 1; ; attempt++) {
    try { client = await getPool().connect(); break; }
    catch (e) { if (!CONNECT_FAILURE.test((e as Error).message ?? "") || attempt >= 3) throw e; }
  }
  const q: Q = async <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) =>
    (await client!.query<T>(text, params)).rows;
  try {
    await client.query("BEGIN");
    const out = await fn(q);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
