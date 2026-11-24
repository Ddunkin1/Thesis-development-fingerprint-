// npm run seed:admin  -> creates the admin from ADMIN_USERNAME / ADMIN_PASSWORD. Safe to re-run.
// npm run reset:admin -> same, but resets the password of an existing admin to ADMIN_PASSWORD.
// Credentials come only from the env file; the password is never logged.
import bcrypt from "bcryptjs";
import { Client } from "pg";

async function main() {
  const reset = process.argv.includes("--reset");
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set in the env file");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  await c.connect();
  const existing = await c.query("SELECT id FROM users WHERE username=$1", [username]);
  if (existing.rowCount) {
    if (reset) {
      const hash = await bcrypt.hash(password, 12);
      await c.query("UPDATE users SET password_hash=$1, must_change_password=false WHERE username=$2", [hash, username]);
      console.log(`Admin "${username}": password reset from ADMIN_PASSWORD.`);
    } else {
      console.log(`Admin "${username}" already exists - nothing to do.`);
    }
  } else {
    const hash = await bcrypt.hash(password, 12);
    await c.query(
      `INSERT INTO users(full_name, username, password_hash, role, must_change_password, consent_given)
       VALUES ('Gym Administrator', $1, $2, 'admin', false, true)`,
      [username, hash],
    );
    console.log(`Admin "${username}" created.`);
  }
  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
