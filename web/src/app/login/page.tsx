"use client";
import { useState } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not sign in.");
      setBusy(false);
      return;
    }
    // Full navigation so proxy.ts routes by role (admin / member / forced password change).
    window.location.href = data.mustChange ? "/change-password" : data.role === "admin" ? "/admin" : "/member";
  }

  return (
    <AuthFrame title="Sign in" subtitle="Use the username your gym gave you.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" required className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10" />
        </div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button type="submit" disabled={busy} className="h-10 w-full text-base font-semibold">{busy ? "Signing in..." : "Sign in"}</Button>
      </form>
    </AuthFrame>
  );
}
