// Fingerprint templates are encrypted before they are stored (AES-256-GCM).
//   * The key lives in TEMPLATE_ENCRYPTION_KEY (environment), never in the database, so a copy of the database
//     alone cannot be used to read the templates.
//   * Each stored value is tied to its owner and finger (additional authenticated data): moving a template to
//     another member's row makes decryption fail.
//   * It does NOT protect against someone who controls the running server, which has the key.
// Stored layout: "CGE1" | 12-byte IV | 16-byte tag | ciphertext
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("CGE1");
const IV = 12;
const TAG = 16;

export function parseKey(value: string | undefined): Buffer {
  if (!value) throw new Error("Missing required environment variable: TEMPLATE_ENCRYPTION_KEY");
  const key = Buffer.from(value.trim(), "base64");
  if (key.length !== 32) throw new Error("TEMPLATE_ENCRYPTION_KEY must be 32 random bytes written in base64.");
  return key;
}

const owner = (userId: number, finger: number) => Buffer.from(`fingerprint:${userId}:${finger}`);

export const isEncrypted = (stored: Buffer) => stored.length > MAGIC.length + IV + TAG && stored.subarray(0, MAGIC.length).equals(MAGIC);

export function encryptTemplate(plain: Buffer, userId: number, finger: number, key: Buffer): Buffer {
  const iv = randomBytes(IV);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(owner(userId, finger));
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}

/** Throws if the value is not encrypted, was changed, belongs to someone else, or the key is wrong. */
export function decryptTemplate(stored: Buffer, userId: number, finger: number, key: Buffer): Buffer {
  if (!isEncrypted(stored)) throw new Error("A stored template is not encrypted. Run: npm run encrypt:templates");
  const iv = stored.subarray(MAGIC.length, MAGIC.length + IV);
  const tag = stored.subarray(MAGIC.length + IV, MAGIC.length + IV + TAG);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(owner(userId, finger));
  d.setAuthTag(tag);
  return Buffer.concat([d.update(stored.subarray(MAGIC.length + IV + TAG)), d.final()]);
}
