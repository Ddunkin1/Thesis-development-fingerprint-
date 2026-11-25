"use client";
import { useState } from "react";
import { toast } from "sonner";
import { pinProblem } from "@/lib/pin-rules";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Create the PIN, change it, or replace a forgotten one. All three need the admin password. */
export function PinSettings() {
  const { data } = useApi<{ isSet: boolean }>("/api/admin/pin");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const problem = pinProblem(pin) ?? (pin !== again ? "The two PINs do not match." : null);
    if (problem) { setError(problem); return; }
    setBusy(true); setError("");
    const res = await fetch("/api/admin/pin", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, pin }) }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) { setError(body?.error ?? "Could not save the PIN."); return; }
    setPassword(""); setPin(""); setAgain(""); setSaved(true);
    toast.success("PIN saved");
  }

  const pinInput = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={4} required className="h-11 w-36 text-center text-lg tracking-[0.4em]" value={value} onChange={(e) => set(digits(e.target.value))} />
    </div>
  );

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-lg border bg-card p-6">
      <p className="text-sm font-medium">{saved || data?.isSet ? "A PIN is set. Use this form to change it, or if you forgot it." : data ? "No PIN yet. Create one now." : " "}</p>
      <div className="space-y-1.5">
        <Label htmlFor="admin-password">Admin password</Label>
        <Input id="admin-password" type="password" autoComplete="current-password" required className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex gap-4">{pinInput("new-pin", "New PIN", pin, setPin)}{pinInput("again-pin", "Type it again", again, setAgain)}</div>
      {error && <p role="alert" className="text-sm font-medium text-bad">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save PIN"}</Button>
    </form>
  );
}
