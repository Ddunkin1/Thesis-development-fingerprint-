"use client";
import { Copy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { bridge } from "@/lib/bridge-client";
import { useBridgeStatus } from "@/lib/use-bridge-status";
import { useMembershipPrice } from "@/lib/use-membership-price";
import { BridgeBanner } from "./BridgeBanner";
import { FingerEnroll } from "./FingerEnroll";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "monthly" | "walkin";
interface Saved { kind: Mode; username?: string; password?: string; expiryDate?: string; fullName: string }

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success("Copied"), () => toast.error("Could not copy"));
}

/** Numbered section heading used by the two form sections. */
function StepTitle({ n, title, right }: { n: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 border-b pb-4">
      <h2 className="flex items-center gap-3 text-lg font-semibold leading-none">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-sm text-brand">{n}</span>{title}
      </h2>
      {right}
    </div>
  );
}

const card = "rounded-lg border bg-card p-6";
const pesos = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const addDaysTo = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)); };

export function RegisterForm() {
  const [mode, setMode] = useState<Mode>(useSearchParams().get("mode") === "walkin" ? "walkin" : "monthly");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [amount, setAmount] = useState("");
  const [cash, setCash] = useState("");                     // optional cash-received helper (not stored)
  const [primary, setPrimary] = useState<string | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ username: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [walkinId, setWalkinId] = useState<number | null>(null); // set when converting a walk-in
  const [validUntil, setValidUntil] = useState("");
  const price = useMembershipPrice(); // monthly fee is fixed by the server
  const scanner = useBridgeStatus();
  const [walkins, setWalkins] = useState<{ id: number; fullName: string; converted: boolean }[]>([]);

  // "Valid until" = today (Manila) + 30 days. Computed after mount so a prerendered date can never be stale.
  useEffect(() => {
    const t = setTimeout(() => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
      setValidUntil(new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(addDaysTo(today, 30)));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Today's walk-ins, so one can be converted to a monthly member.
  useEffect(() => {
    if (mode !== "walkin") return;
    fetch("/api/admin/walkins").then((r) => (r.ok ? r.json() : null)).then((d) => d && setWalkins(d.walkins));
  }, [mode, saved]);

  // Live preview of the generated username / default password (debounced).
  useEffect(() => {
    if (mode !== "monthly" || fullName.trim().length < 2) return; // (the preview box below hides itself)
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/register-preview?fullName=${encodeURIComponent(fullName)}`);
      if (res.ok) setPreview((await res.json()).preview);
    }, 350);
    return () => clearTimeout(t);
  }, [fullName, mode]);

  const amountNum = Number(amount);
  const amountOk = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum >= 0;
  const nameOk = fullName.trim().length >= 2;
  const canEnroll = nameOk && consent;
  const canSave = !saving && nameOk && (mode === "walkin" ? amountOk : consent && !!primary && price !== null);
  const cashNum = Number(cash);
  const cashOk = cash.trim() !== "" && Number.isFinite(cashNum);
  const missing = !nameOk ? "Enter the member's full name." : !consent ? "Tick the data privacy consent." : !primary ? "Capture the primary fingerprint." : "";

  async function save() {
    setSaving(true); setError("");
    const body = mode === "monthly"
      ? { fullName, consent, ...(walkinId ? { walkinId } : {}), fingers: [{ fingerIndex: 0, template: primary }, ...(backup ? [{ fingerIndex: 1, template: backup }] : [])] }
      : { fullName, amount: amountNum };
    const res = await fetch(mode === "monthly" ? "/api/admin/members" : "/api/admin/walkins", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Could not save."); return; }
    if (mode === "monthly") bridge.sync(); // make the new fingerprint matchable right away
    setSaved({ kind: mode, fullName, username: data.username, password: data.password, expiryDate: data.expiryDate });
  }

  function reset() {
    setSaved(null); setFullName(""); setConsent(false); setAmount(""); setCash(""); setPrimary(null); setBackup(null); setPreview(null); setError(""); setWalkinId(null);
  }

  const header = (
    <PageHeader title="Register member" description="Add a monthly member with a fingerprint, or log a single walk-in pass for today.">
      <div role="radiogroup" aria-label="Registration type" className="flex rounded-lg border bg-muted p-1">
        {([["monthly", "Monthly member"], ["walkin", "Walk-in pass"]] as const).map(([key, label]) => (
          <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => { setMode(key); setError(""); }}
            className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${mode === key ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>
    </PageHeader>
  );

  if (saved) {
    return (
      <div>
        {header}
        <div className="max-w-xl rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 text-ok">
            <h2 className="text-2xl font-semibold">{saved.kind === "monthly" ? "Member registered" : "Walk-in logged"}</h2>
          </div>
          <p className="mt-1 text-muted-foreground">{saved.fullName}</p>
          {saved.kind === "monthly" ? (
            <>
              <dl className="mt-5 divide-y rounded-lg border bg-muted font-mono text-sm">
                {[["Username", saved.username!], ["Default password", saved.password!], ["Valid until", saved.expiryDate!]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="flex items-center gap-2 font-semibold">{v}
                      {k !== "Valid until" && <Button type="button" variant="ghost" size="icon-xs" aria-label={`Copy ${k}`} onClick={() => copy(v)}><Copy /></Button>}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">The member must change this password on first login. Give them these details now.</p>
            </>
          ) : <p className="mt-3 text-sm text-muted-foreground">Valid for one session today. No account was created.</p>}
          <Button className="mt-5" onClick={reset}>Register another</Button>
        </div>
      </div>
    );
  }

  const saveBar = (
    <div>
      {error && <p role="alert" className="mb-3 text-sm font-medium text-bad">{error}</p>}
      <Button onClick={save} disabled={!canSave} className="h-12 w-full text-base font-semibold">
        {saving ? "Saving…" : mode === "monthly" ? "Save member and activate fingerprint" : "Save walk-in pass"}
      </Button>
      <p className="mt-3 text-center text-[0.8125rem] text-muted-foreground">
        {canSave ? "Ready to register. The scanner will be used right away." : mode === "monthly" ? missing : "Enter the visitor name and the amount paid."}
      </p>
    </div>
  );

  return (
    <div className="min-w-0">
      {header}
      <BridgeBanner className="mb-6" />

      {mode === "monthly" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className={card}>
              <StepTitle n="01" title="Member profile" right={<span className="rounded-md bg-muted px-2.5 py-1 text-[0.8125rem] font-semibold text-muted-foreground">Step 1 of 2</span>} />
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-semibold">Full name <span className="text-bad">*</span></Label>
                <div className="relative">
                  <Input id="fullName" className="h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} placeholder="e.g. Juan Dela Cruz" autoComplete="off" />
                </div>
                <p className="text-[0.8125rem] text-muted-foreground">The username and default password are created from the last word of the name.</p>
              </div>

              {preview && nameOk && (
                <div className="mt-5 rounded-lg bg-accent p-4 text-sm">
                  <div className="font-mono">
                    <div className="eyebrow mb-1 font-sans">Account preview</div>
                    <div>Username <b className="text-brand">{preview.username}</b></div>
                    <div>Password <b className="text-brand">{preview.password}</b></div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-start gap-3 rounded-lg border bg-muted p-4">
                <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <Label htmlFor="consent" className="block text-sm font-normal leading-relaxed">
                  <b className="font-semibold">Data privacy consent (RA 10173).</b> The member agrees that Chaq Gym may collect their name and a fingerprint
                  <i> template</i> (a numeric code, never the fingerprint image) to record attendance. They can ask to have it deleted at any time.
                </Label>
              </div>
            </section>

            <section className={card}>
              <StepTitle n="02" title="Biometric fingerprint enrollment"
                right={<span className={`rounded-md px-2.5 py-1 text-[0.8125rem] font-semibold ${scanner === "ok" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{scanner === "ok" ? "Sensor ready" : "Sensor not ready"}</span>} />
              <div className="space-y-4">
                <FingerEnroll label="Step 1: Primary finger" required hint="Ask the member to press their preferred finger firmly on the scanner, three times, lifting in between."
                  disabled={!canEnroll} template={primary} onTemplate={setPrimary} />
                {!canEnroll && <p className="text-[0.8125rem] text-muted-foreground">Enter the full name and tick the consent box to enable scanning.</p>}
                <FingerEnroll label="Step 2: Backup finger" hint="Optional: a second finger, handy on rainy or sweaty days."
                  disabled={!canEnroll || !primary} template={backup} onTemplate={setBackup} />
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24">
            <section className={card}>
              <div className="mb-4 text-lg font-semibold">Membership</div>
              <div className="flex items-end justify-between gap-4 rounded-lg bg-accent p-5">
                <div>
                  <div className="text-lg font-semibold leading-none">Monthly pass</div>
                  <div className="mt-2 text-sm text-muted-foreground">30 days of gym access</div>
                </div>
                <div className="numeral text-5xl text-brand"><span className="mr-1 align-top font-sans text-xl font-semibold">₱</span>{price ?? "…"}</div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
                <span className="font-semibold">Validity</span>
                <span className="font-bold text-brand">Valid until {validUntil || "…"}</span>
              </div>

              <div className="mb-3 mt-6 text-sm font-semibold">Included</div>
              <ul className="list-disc space-y-2 pl-5 text-sm marker:text-brand">
                {["Fingerprint check-in at the front-desk kiosk", "Workout streaks, badges and the monthly leaderboard", "A personal member account to see their streak on a phone"].map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border bg-muted p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cash" className="text-sm font-semibold">Cash received (optional)</Label>
                  <Input id="cash" inputMode="decimal" className="h-11" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="e.g. 1000" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{cashOk && price !== null && cashNum < price ? "Still short" : "Change to return"}</div>
                  <div className={`numeral mt-2 text-4xl ${cashOk && price !== null && cashNum < price ? "text-bad" : "text-ok"}`}>
                    <span className="mr-1 align-top font-sans text-base font-semibold">₱</span>{cashOk && price !== null ? pesos(Math.abs(cashNum - price)) : "0.00"}
                  </div>
                </div>
              </div>

              <div className="mt-6">{saveBar}</div>
            </section>
          </aside>
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className={card}>
              <StepTitle n="01" title="Visitor details" />
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold">Full name <span className="text-bad">*</span></Label>
                  <div className="relative">
                    <Input id="fullName" className="h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} placeholder="e.g. Maria Santos" autoComplete="off" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-sm font-semibold">Amount paid (₱) <span className="text-bad">*</span></Label>
                  <Input id="amount" className="h-11" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              {walkinId && <p className="mt-4 text-xs font-medium text-brand">Converting a walk-in: they will be linked to this new member.</p>}
            </section>

            {walkins.length > 0 && (
              <section className={card}>
                <div className="mb-3 text-lg font-semibold">Today&apos;s walk-ins</div>
                <ul className="divide-y text-sm">
                  {walkins.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="font-semibold">{w.fullName}</span>
                      {w.converted ? <span className="text-xs font-semibold text-ok">Converted</span> : (
                        <Button size="sm" variant="outline" onClick={() => { setMode("monthly"); setFullName(w.fullName); setWalkinId(w.id); }}>
                          Convert to monthly member
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="xl:sticky xl:top-24">
            <section className={card}>
              <div className="mb-4 text-lg font-semibold">Walk-in pass</div>
              <div className="rounded-lg bg-accent p-5">
                <div className="text-lg font-semibold leading-none">Single session</div>
                <div className="mt-2 text-sm text-muted-foreground">Valid for one visit today. No account and no fingerprint needed.</div>
              </div>
              <div className="mt-6">{saveBar}</div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
