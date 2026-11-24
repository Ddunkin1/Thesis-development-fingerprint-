"use client";
import { useState } from "react";
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
    window.location.href = data.role === "admin" ? "/admin" : "/member";
  }

  return (
    <AuthFrame title="New password" subtitle="Choose your own password before continuing: 8+ characters with letters and numbers.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="current">Current password</Label><Input id="current" name="current" type="password" required className="h-10" /></div>
        <div className="space-y-1.5"><Label htmlFor="next">New password</Label><Input id="next" name="next" type="password" required className="h-10" /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">Confirm new password</Label><Input id="confirm" name="confirm" type="password" required className="h-10" /></div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button type="submit" disabled={busy} className="h-10 w-full text-base font-semibold">{busy ? "Saving..." : "Change password"}</Button>
      </form>
    </AuthFrame>
  );
}
