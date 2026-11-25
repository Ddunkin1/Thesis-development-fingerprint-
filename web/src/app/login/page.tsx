"use client";
import { ArrowRight, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { homeOf } from "@/lib/roles";
import { AuthFrame } from "@/components/AuthFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  // The browser may show a saved copy of this page (Back button) without asking the server.
  // If the person is still signed in, send them back into the app.
  useEffect(() => {
    let stop = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => { if (me && !stop) window.location.replace(homeOf(me.role)); })
      .catch(() => {}); // offline: just show the form
    return () => { stop = true; };
  }, []);

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
    window.location.replace(data.mustChange ? "/change-password" : homeOf(data.role)); // replace: Back will not return here
  }

  return (
    <AuthFrame eyebrow="Front desk and member access" title="Sign in" subtitle="Enter the username and password the gym gave you.">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className="eyebrow !text-foreground">Username</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="username" name="username" autoComplete="username" required className="h-13 rounded-xl bg-card pl-11 text-base shadow-card" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="eyebrow !text-foreground">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="h-13 rounded-xl bg-card pl-11 pr-12 text-base shadow-card" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-bad dark:bg-red-500/10">{error}</p>}
        <Button type="submit" disabled={busy} className="h-14 w-full rounded-xl font-display text-xl font-extrabold uppercase tracking-wide shadow-card">
          {busy ? "Signing in…" : <>Sign in <ArrowRight className="size-5" /></>}
        </Button>
        <p className="text-center text-sm text-muted-foreground">Forgot your password? Ask the front desk to reset it for you.</p>
      </form>
    </AuthFrame>
  );
}
