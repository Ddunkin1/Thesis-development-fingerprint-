"use client";
import { CheckCircle2, Copy, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { bridge } from "@/lib/bridge-client";
import { useMembershipPrice } from "@/lib/use-membership-price";
import { BridgeBanner } from "./BridgeBanner";
import { FingerEnroll } from "./FingerEnroll";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "monthly" | "walkin";
interface Saved { kind: Mode; username?: string; password?: string; expiryDate?: string; fullName: string }

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success("Copied"), () => toast.error("Could not copy"));
}

export function RegisterForm() {
  const [mode, setMode] = useState<Mode>("monthly");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [amount, setAmount] = useState("");
  const [primary, setPrimary] = useState<string | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ username: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [walkinId, setWalkinId] = useState<number | null>(null); // set when converting a walk-in
  const price = useMembershipPrice(); // monthly fee is fixed by the server
  const [walkins, setWalkins] = useState<{ id: number; fullName: string; converted: boolean }[]>([]);

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
    setSaved(null); setFullName(""); setConsent(false); setAmount(""); setPrimary(null); setBackup(null); setPreview(null); setError(""); setWalkinId(null);
  }

  if (saved) {
    return (
      <div className="max-w-xl rounded-xl border bg-card border-ok/40 p-6">
        <div className="flex items-center gap-3 text-ok">
          <CheckCircle2 className="size-6" />
          <h2 className="font-display text-3xl font-bold uppercase">{saved.kind === "monthly" ? "Member registered" : "Walk-in logged"}</h2>
        </div>
        <p className="mt-1 text-muted-foreground">{saved.fullName}</p>
        {saved.kind === "monthly" ? (
          <>
            <dl className="mt-5 divide-y rounded-md border bg-card font-mono text-sm">
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
    );
  }

  return (
    <div className="max-w-2xl">
      <BridgeBanner className="mb-4" />
      <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(""); }}>
        <TabsList><TabsTrigger value="monthly">Monthly member</TabsTrigger><TabsTrigger value="walkin">Walk-in</TabsTrigger></TabsList>
      </Tabs>

      <div className="mt-4 space-y-5 rounded-xl border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" className="h-10" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} placeholder="Juan Dela Cruz" autoComplete="off" />
        </div>

        {mode === "monthly" && (
          <>
            {preview && nameOk && (
              <div className="flex items-start gap-3 rounded-md bg-muted p-3 text-sm">
                <UserRound className="mt-0.5 size-4 text-muted-foreground" />
                <div className="font-mono">
                  <div className="eyebrow mb-1">Account preview</div>
                  <div>Username <b className="text-brand">{preview.username}</b></div>
                  <div>Password <b className="text-brand">{preview.password}</b></div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <Label htmlFor="consent" className="block text-sm font-normal leading-relaxed">
                <b className="font-semibold">Data privacy consent (RA 10173).</b> The member agrees that Chaq Gym may collect their name and a fingerprint
                <i> template</i> (a numeric code, never the fingerprint image) to record attendance. They can ask to have it deleted at any time.
              </Label>
            </div>

            <FingerEnroll label="Primary finger (required)" disabled={!canEnroll} template={primary} onTemplate={setPrimary} />
            {!canEnroll && <p className="-mt-3 text-xs text-muted-foreground">Enter the full name and tick the consent box to enable scanning.</p>}
            <FingerEnroll label="Backup finger (optional)" disabled={!canEnroll || !primary} template={backup} onTemplate={setBackup} />
          </>
        )}

        {mode === "monthly" ? (
          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
            <div>
              <div className="eyebrow">Membership fee</div>
              <div className="text-xs text-muted-foreground">30 days, fixed price</div>
            </div>
            <div className="numeral text-4xl"><span className="mr-1.5 align-top font-sans text-lg font-medium text-muted-foreground">₱</span>{price ?? "…"}</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount paid (₱)</Label>
            <Input id="amount" className="h-10" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        )}

        {walkinId && <p className="text-xs text-brand">Converting a walk-in: they will be linked to this new member.</p>}
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button onClick={save} disabled={!canSave} className="h-10 w-full text-base font-semibold">
          {saving ? "Saving..." : mode === "monthly" ? "Save member" : "Save walk-in"}
        </Button>
      </div>

      {mode === "walkin" && walkins.length > 0 && (
        <section className="mt-6 rounded-xl border bg-card p-4">
          <h3 className="eyebrow mb-2">Today&apos;s walk-ins</h3>
          <ul className="divide-y text-sm">
            {walkins.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2">
                <span>{w.fullName}</span>
                {w.converted ? <span className="text-xs text-ok">Converted</span> : (
                  <Button size="xs" variant="outline" onClick={() => { setMode("monthly"); setFullName(w.fullName); setWalkinId(w.id); }}>
                    Convert to monthly member
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
