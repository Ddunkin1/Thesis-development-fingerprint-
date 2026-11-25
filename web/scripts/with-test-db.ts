// npm run testdb -- <command>   e.g.  npm run testdb -- npm run migrate
// Runs a command against a SEPARATE database ("chaq_test", on the same Neon project) instead of the real one,
// so trying things out (and the accuracy tests of the study) never touch real gym records.
// The database is created on first use. The command inherits the modified connection settings.
import { spawnSync } from "node:child_process";
import { connect } from "./db-common";

const NAME = "chaq_test";

function swap(url: string) {
  const u = new URL(url);
  u.pathname = `/${NAME}`;
  return u.toString();
}

async function main() {
  const cmd = process.argv.slice(2);
  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DATABASE_URL_UNPOOLED || pooled;
  if (!cmd.length || !pooled || !direct) throw new Error("Usage: npm run testdb -- <command>  (DATABASE_URL must be set)");

  const c = await connect(direct);
  const found = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [NAME]);
  if (!found.rowCount) {
    await c.query(`CREATE DATABASE ${NAME}`);
    console.log(`Created database "${NAME}".`);
  }
  await c.end();

  console.log(`Using the TEST database "${NAME}".`);
  const r = spawnSync(cmd.join(" "), {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, DATABASE_URL: swap(pooled), DATABASE_URL_UNPOOLED: swap(direct), CHAQ_TEST_DB: "1" },
  });
  process.exit(r.status ?? 1);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
