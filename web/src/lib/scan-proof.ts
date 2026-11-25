// The bridge signs every scan result, so the server only accepts results that really came from the scanner program.
//   proof = base64url(JSON {v:1, s:status, u:userId|null, t:unix ms, n:random}) + "." + base64url(HMAC-SHA256)
//   signing key = HMAC-SHA256(BRIDGE_API_KEY, "chaq-scan-v1")   (see bridge/ScanProof.cs - keep both in step)
// A proof is only valid for a short time, and its random number can be used once (checked in the database).
// This stops a changed, invented, old or re-sent result. It cannot stop someone who has stolen the bridge key.
import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_AGE_MS = 120_000; // also tolerates a small clock difference between the gym PC and the server

export interface ScanResult { userId: number | null; nonce: string }
export type ProofCheck = { ok: true; result: ScanResult } | { ok: false; reason: "invalid" | "expired" };

const signingKey = (apiKey: string) => createHmac("sha256", apiKey).update("chaq-scan-v1").digest();
const sign = (payload: string, apiKey: string) => createHmac("sha256", signingKey(apiKey)).update(payload).digest("base64url");

export function verifyScanProof(proof: string, apiKey: string, now = Date.now()): ProofCheck {
  const bad: ProofCheck = { ok: false, reason: "invalid" };
  const [payload, signature, extra] = proof.split(".");
  if (!payload || !signature || extra !== undefined) return bad;
  const expected = Buffer.from(sign(payload, apiKey));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return bad;

  let p: { v?: unknown; s?: unknown; u?: unknown; t?: unknown; n?: unknown };
  try { p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return bad; }
  if (p.v !== 1 || typeof p.t !== "number" || typeof p.n !== "string" || p.n.length < 16 || p.n.length > 64) return bad;
  const matched = p.s === "matched" && Number.isInteger(p.u) && (p.u as number) > 0;
  const noMatch = p.s === "no_match" && p.u === null;
  if (!matched && !noMatch) return bad;
  if (Math.abs(now - p.t) > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true, result: { userId: matched ? (p.u as number) : null, nonce: p.n } };
}

/** The same signing the bridge does. Used only by tests. */
export function makeScanProof(userId: number | null, apiKey: string, nonce: string, time = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, s: userId === null ? "no_match" : "matched", u: userId, t: time, n: nonce })).toString("base64url");
  return `${payload}.${sign(payload, apiKey)}`;
}
