"use client";
import { ArrowRight, Lock } from "lucide-react";
import { useState } from "react";
import { homeOf } from "@/lib/roles";
import { AuthFrame } from "@/components/AuthFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("next") !== f.get("confirm")) return setError("New passwords do not match.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: f.get("current"), next: f.get("next") }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Could not change password."); setBusy(false); return; }
    window.location.href = homeOf(data.role);
  }

  const field = (id: string, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="eyebrow !text-foreground">{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={id} name={id} type="password" required className="h-13 rounded-xl bg-card pl-11 text-base shadow-card" />
      </div>
    </div>
  );

  return (
    <AuthFrame eyebrow="Account security" title="New password" subtitle="Choose your own password before continuing: at least 8 characters, with letters and numbers.">
      <form onSubmit={onSubmit} className="space-y-5">
        {field("current", "Current password")}
        {field("next", "New password")}
        {field("confirm", "Confirm new password")}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-bad dark:bg-red-500/10">{error}</p>}
        <Button type="submit" disabled={busy} className="h-14 w-full rounded-xl font-display text-xl font-extrabold uppercase tracking-wide shadow-card">
          {busy ? "Saving…" : <>Change password <ArrowRight className="size-5" /></>}
        </Button>
      </form>
    </AuthFrame>
  );
}
