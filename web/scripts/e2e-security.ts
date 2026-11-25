// End-to-end checks of the security rules, run against the TEST database only.
//   1) npm run testdb -- npx next start -p 3100     (after npm run build)
//   2) npm run testdb -- npm run test:security
// It creates test accounts and deletes them again. It refuses to run against the real database.
import { randomBytes } from "node:crypto";
import { connect } from "./db-common";
import { makeScanProof } from "../src/lib/scan-proof";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3100";
let passed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, extra = "") {
  if (ok) passed++;
  else failures.push(`${name} ${extra}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
}

/** A tiny browser: remembers the sign-in cookie and the short "PIN was typed" cookie. */
function client() {
  const jar = new Map<string, string>();
  return async function call(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + url, {
      method,
      redirect: "manual",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const line of res.headers.getSetCookie()) {
      const m = line.match(/^(chaq_[a-z]+)=([^;]*)/);
      if (!m) continue;
      if (m[2]) jar.set(m[1], m[2]);
      else jar.delete(m[1]);
    }
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, data, text, location: res.headers.get("location") ?? "" };
  };
}

async function main() {
  if (process.env.CHAQ_TEST_DB !== "1") throw new Error("Run through: npm run testdb -- npm run test:security");
  const apiKey = process.env.BRIDGE_API_KEY!;
  const nonce = () => randomBytes(16).toString("hex");
  const db = await connect();
  const stamp = Date.now().toString(36);
  const template = randomBytes(1200);

  const admin = client();
  const r0 = await admin("POST", "/api/auth/login", { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  check("admin can sign in", r0.status === 200, r0.text);

  // ---- registration + encryption ----
  const name = `Zz Testmember${stamp}`;
  const reg = await admin("POST", "/api/admin/members", { fullName: name, consent: true, fingers: [{ fingerIndex: 0, template: template.toString("base64") }] });
  check("register a member", reg.status === 201, reg.text);
  const memberId = Number(reg.data.userId);
  const stored = (await db.query("SELECT template FROM fingerprints WHERE user_id=$1", [memberId])).rows[0].template as Buffer;
  check("template is stored encrypted", stored.subarray(0, 4).toString() === "CGE1" && !stored.includes(template.subarray(0, 32)));
  const tpl = await fetch(`${BASE}/api/bridge/templates`, { headers: { "x-bridge-api-key": apiKey } }).then((r) => r.json());
  const mine = tpl.templates?.find((t: { userId: number }) => t.userId === memberId);
  check("bridge receives the original template", mine?.template === template.toString("base64"));
  const noKey = await fetch(`${BASE}/api/bridge/templates`, { headers: { "x-bridge-api-key": "wrong" } });
  check("templates refused with a wrong key", noKey.status === 401);
  const consent = (await db.query("SELECT consent_at, consent_version FROM users WHERE id=$1", [memberId])).rows[0];
  check("consent time and version recorded", !!consent.consent_at && !!consent.consent_version);

  // ---- PIN: setting it needs the admin password ----
  const PIN = "7392";
  const withPin = (pin = PIN) => ({ "x-admin-pin": pin });
  const noPass = await admin("PUT", "/api/admin/pin", { password: "not-the-password", pin: PIN });
  check("a PIN cannot be set without the admin password", noPass.status === 400, noPass.text);
  check("an easy PIN is refused", (await admin("PUT", "/api/admin/pin", { password: process.env.ADMIN_PASSWORD, pin: "1234" })).status === 400);
  check("the admin sets a PIN", (await admin("PUT", "/api/admin/pin", { password: process.env.ADMIN_PASSWORD, pin: PIN })).status === 200);
  const pinRow = (await db.query("SELECT admin_pin_hash FROM users WHERE role='admin'")).rows[0].admin_pin_hash as string;
  check("only a hash of the PIN is stored", pinRow.startsWith("$2") && !pinRow.includes(PIN));

  // ---- important actions need the PIN every time ----
  for (const [label, method, url, body] of [
    ["delete a member", "DELETE", `/api/admin/members/${memberId}`, {}],
    ["renew a membership", "POST", `/api/admin/members/${memberId}/renew`, undefined],
    ["reset a member password", "POST", `/api/admin/members/${memberId}/reset-password`, undefined],
    ["change a fingerprint", "PUT", `/api/admin/members/${memberId}/fingerprint`, { fingerIndex: 0, template: template.toString("base64") }],
    ["remove fingerprints", "DELETE", `/api/admin/members/${memberId}/fingerprint`, undefined],
  ] as const) {
    const r = await admin(method, url, body);
    check(`without a PIN, cannot ${label}`, r.status === 403 && r.data.code === "pin_required", `${r.status} ${r.text}`);
  }
  const paymentsBefore = Number((await db.query("SELECT count(*) n FROM payments WHERE user_id=$1", [memberId])).rows[0].n);
  const wrong = await admin("POST", `/api/admin/members/${memberId}/renew`, undefined, withPin("0852"));
  check("a wrong PIN is refused and nothing is charged", wrong.status === 403 && wrong.data.code === "pin_wrong" && Number((await db.query("SELECT count(*) n FROM payments WHERE user_id=$1", [memberId])).rows[0].n) === paymentsBefore, wrong.text);
  check("the right PIN renews", (await admin("POST", `/api/admin/members/${memberId}/renew`, undefined, withPin())).status === 200);

  // ---- private figures stay hidden until the PIN ----
  const dash = await admin("GET", "/api/admin/dashboard");
  check("income is not sent before the PIN", dash.status === 200 && dash.data.incomeToday === null && dash.data.incomeMonth === null, dash.text.slice(0, 200));
  for (const url of ["/api/admin/reports?section=attendance", "/api/admin/activity", "/api/admin/members?format=csv", "/api/admin/attendance?format=csv"]) {
    const r = await admin("GET", url);
    check(`locked before the PIN: ${url.replace("/api/admin/", "")}`, r.status === 403 && r.data.code === "pin_locked", `${r.status}`);
  }
  check("everyday screens work without a PIN", (await admin("GET", "/api/admin/members")).status === 200 && (await admin("GET", "/api/admin/attendance")).status === 200);
  check("unlock refuses a wrong PIN", (await admin("POST", "/api/admin/pin/unlock", undefined, withPin("0852"))).status === 403);
  const opened = await admin("POST", "/api/admin/pin/unlock", undefined, withPin());
  check("unlock with the right PIN", opened.status === 200, opened.text);
  const dash2 = await admin("GET", "/api/admin/dashboard");
  check("income is shown after the PIN", typeof dash2.data.incomeToday === "number");
  check("reports and export open after the PIN", (await admin("GET", "/api/admin/reports?section=attendance")).status === 200 && (await admin("GET", "/api/admin/members?format=csv")).status === 200);
  check("hide again", (await admin("DELETE", "/api/admin/pin/unlock")).status === 200);
  check("reports locked again", (await admin("GET", "/api/admin/reports?section=attendance")).status === 403);

  // ---- check-in screen: normal admin session, one tap to leave; members stay out ----
  const kiosk = admin;
  const outsider = client();
  check("signed-out visitors cannot record scans", (await outsider("POST", "/api/kiosk/scan", { proof: makeScanProof(memberId, apiKey, nonce()) })).status === 401);
  const asMember = client();
  await asMember("POST", "/api/auth/login", { username: reg.data.username, password: reg.data.password });
  check("a member cannot record scans or open the PIN", (await asMember("POST", "/api/kiosk/scan", { proof: makeScanProof(memberId, apiKey, nonce()) })).status === 403 && (await asMember("GET", "/api/admin/pin")).status === 403);
  // ---- signed scans ----
  const old = await kiosk("POST", "/api/kiosk/scan", { userId: memberId });
  check("an unsigned member id is refused", old.status === 400);
  const forged = await kiosk("POST", "/api/kiosk/scan", { proof: makeScanProof(memberId, "not-the-key", nonce()) });
  check("a forged signature is refused", forged.status === 400);
  const stale = await kiosk("POST", "/api/kiosk/scan", { proof: makeScanProof(memberId, apiKey, nonce(), Date.now() - 10 * 60_000) });
  check("an old result is refused", stale.status === 400 && stale.data.reason === "expired", stale.text);
  const good = makeScanProof(memberId, apiKey, nonce());
  const [payload, sig] = good.split(".");
  const altered = Buffer.from(Buffer.from(payload, "base64url").toString().replace(`"u":${memberId}`, `"u":${memberId + 1}`)).toString("base64url");
  check("a changed member id is refused", (await kiosk("POST", "/api/kiosk/scan", { proof: `${altered}.${sig}` })).status === 400);
  const first = await kiosk("POST", "/api/kiosk/scan", { proof: good });
  check("a real signed scan checks in", first.status === 200 && first.data.status === "checked_in", first.text.slice(0, 200));
  const again = await kiosk("POST", "/api/kiosk/scan", { proof: good });
  check("the same result cannot be used twice", again.status === 409, `${again.status}`);
  const unknown = await kiosk("POST", "/api/kiosk/scan", { proof: makeScanProof(null, apiKey, nonce()) });
  check("a signed no-match shows not recognised", unknown.data.status === "no_match", unknown.text);

  // ---- manual check-in ----
  const reg2 = await admin("POST", "/api/admin/members", { fullName: `Zz Manualmember${stamp}`, consent: true, fingers: [{ fingerIndex: 0, template: randomBytes(900).toString("base64") }] });
  const id2 = Number(reg2.data.userId);
  check("manual check-in needs a reason", (await admin("POST", `/api/admin/members/${id2}/manual-checkin`, { reason: "no" })).status === 400);
  const scansBefore = Number((await db.query("SELECT count(*) n FROM scan_log")).rows[0].n);
  const man = await admin("POST", `/api/admin/members/${id2}/manual-checkin`, { reason: "Cut on the finger" });
  check("manual check-in works", man.status === 200 && man.data.status === "checked_in", man.text);
  const row = (await db.query("SELECT method, manual_reason, recorded_by FROM attendance WHERE user_id=$1", [id2])).rows[0];
  check("visit is marked manual with its reason", row.method === "manual" && row.manual_reason === "Cut on the finger" && !!row.recorded_by);
  check("manual entry does not touch the scan log", Number((await db.query("SELECT count(*) n FROM scan_log")).rows[0].n) === scansBefore);
  check("a quick second manual entry is blocked", (await admin("POST", `/api/admin/members/${id2}/manual-checkin`, { reason: "Pressed twice" })).status === 409);
  await db.query("UPDATE memberships SET expiry_date = CURRENT_DATE - 5 WHERE user_id=$1", [id2]);
  check("expired membership cannot be checked in by hand", (await admin("POST", `/api/admin/members/${id2}/manual-checkin`, { reason: "Trying anyway" })).status === 400);

  // ---- consent withdrawal ----
  const wd = await admin("DELETE", `/api/admin/members/${memberId}/fingerprint`, undefined, withPin());
  check("fingerprints can be removed", wd.status === 200 && wd.data.removed === 1, wd.text);
  check("no template remains", Number((await db.query("SELECT count(*) n FROM fingerprints WHERE user_id=$1", [memberId])).rows[0].n) === 0);
  const re = await admin("PUT", `/api/admin/members/${memberId}/fingerprint`, { fingerIndex: 0, template: template.toString("base64") }, withPin());
  check("re-enrolling without new consent is refused", re.status === 400, `${re.status}`);
  const re2 = await admin("PUT", `/api/admin/members/${memberId}/fingerprint`, { fingerIndex: 0, template: template.toString("base64"), consent: true }, withPin());
  check("re-enrolling with new consent works", re2.status === 200, re2.text);

  // ---- swapped template rows are rejected ----
  const other = (await db.query("SELECT template FROM fingerprints WHERE user_id=$1", [id2])).rows[0].template as Buffer;
  const own = (await db.query("SELECT template FROM fingerprints WHERE user_id=$1", [memberId])).rows[0].template as Buffer;
  await db.query("UPDATE fingerprints SET template=$1 WHERE user_id=$2", [other, memberId]);
  const swapped = await fetch(`${BASE}/api/bridge/templates`, { headers: { "x-bridge-api-key": apiKey } });
  check("a template moved to another member is rejected", swapped.status === 500, `${swapped.status}`);
  await db.query("UPDATE fingerprints SET template=$1 WHERE user_id=$2", [own, memberId]);

  // ---- activity log + wrong-PIN limit ----
  await admin("POST", "/api/admin/pin/unlock", undefined, withPin());
  const act = await admin("GET", "/api/admin/activity");
  for (const needle of ["Set or changed the PIN", "Wrong PIN entered", "Manual check-in or check-out", "Removed fingerprints", "Renewed a membership"]) {
    check(`activity log has: ${needle}`, act.text.includes(needle));
  }
  let last = { status: 0, data: {} as Record<string, unknown> };
  for (let i = 0; i < 6; i++) last = await admin("POST", "/api/admin/pin/unlock", undefined, withPin("0852"));
  check("after 5 wrong PINs, trying pauses", last.status === 429 && last.data.code === "pin_paused", JSON.stringify(last.data));
  check("even the right PIN waits during the pause", (await admin("POST", "/api/admin/pin/unlock", undefined, withPin())).status === 429);
  check("check-in keeps working during the pause", (await admin("POST", "/api/kiosk/scan", { proof: makeScanProof(null, apiKey, nonce()) })).status === 200);
  check("a forgotten or paused PIN is reset with the password", (await admin("PUT", "/api/admin/pin", { password: process.env.ADMIN_PASSWORD, pin: PIN })).status === 200);
  check("the new PIN works at once", (await admin("POST", "/api/admin/pin/unlock", undefined, withPin())).status === 200);

  // ---- clean up ----
  for (const id of [memberId, id2]) await admin("DELETE", `/api/admin/members/${id}`, {}, withPin());
  await db.query("UPDATE users SET admin_pin_hash = NULL WHERE role = 'admin'");
  await db.query("DELETE FROM payments WHERE user_id IS NULL AND note LIKE '%zz%'");
  await db.query("DELETE FROM payments WHERE user_id IS NULL AND note ILIKE 'Member: Zz %'");
  await db.end();
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
