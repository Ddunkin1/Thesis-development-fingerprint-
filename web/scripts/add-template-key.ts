// npm run key:templates -> adds a new TEMPLATE_ENCRYPTION_KEY to .env.local if there is none. Never prints it.
// KEEP A PRIVATE COPY of this key. If it is lost, every stored fingerprint must be enrolled again.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const file = ".env.local";
const text = existsSync(file) ? readFileSync(file, "utf8") : "";
if (/^TEMPLATE_ENCRYPTION_KEY=\S+/m.test(text)) {
  console.log("TEMPLATE_ENCRYPTION_KEY already exists in .env.local - nothing changed.");
} else {
  const lead = text && !text.endsWith("\n") ? "\n" : "";
  appendFileSync(file, `${lead}\n# Encrypts stored fingerprint templates. Keep a private copy; losing it means re-enrolling everyone.\nTEMPLATE_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}\n`);
  console.log("A new TEMPLATE_ENCRYPTION_KEY was added to .env.local (not shown).");
}
