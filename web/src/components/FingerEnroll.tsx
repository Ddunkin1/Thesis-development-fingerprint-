"use client";
import { CheckCircle2, Fingerprint, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bridge } from "@/lib/bridge-client";
import { Button } from "@/components/ui/button";

/**
 * One finger's enrollment widget: runs the bridge's 3-scan enrollment and shows progress (1/3, 2/3, 3/3).
 * The captured template (base64) is handed to the parent; nothing is stored until the form is saved.
 */
export function FingerEnroll({
  label, disabled, template, onTemplate, userId,
}: {
  label: string;
  disabled?: boolean;
  template: string | null;
  onTemplate: (t: string | null) => void;
  userId?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leaving the page while a scan is waiting must free the scanner.
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); bridge.cancel(); }, []);

  async function start() {
    setError(""); setCount(0); setMessage("Place your finger on the scanner."); setBusy(true);
    timer.current = setInterval(async () => {
      const p = await bridge.progress();
      if (p.ok) { setCount(p.count); if (p.message) setMessage(p.message); }
    }, 400);
    const r = await bridge.enroll(userId);
    if (timer.current) clearInterval(timer.current);
    setBusy(false);
    if (r.ok) { setCount(3); onTemplate(r.template); setMessage(""); }
    else { setError(r.message); setMessage(""); setCount(0); }
  }

  const done = !!template && !busy;
  return (
    <div className={`rounded-lg border p-4 ${done ? "border-ok/40" : ""}`}>
      <div className="flex items-center gap-4">
        <div className={`relative flex size-14 shrink-0 items-center justify-center rounded-full border
          ${done ? "border-ok text-ok" : busy ? "border-brand text-brand" : "text-muted-foreground"}`}>
          {busy && <span className="absolute inset-0 animate-ping rounded-full border border-brand/60" />}
          {done ? <CheckCircle2 className="size-7" /> : <Fingerprint className="size-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{label}</div>
          <div className="mt-2 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={count} aria-label="Scan progress">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex h-7 flex-1 items-center justify-center rounded text-xs font-semibold tabular-nums transition-colors
                ${count >= n ? "bg-brand-strong text-white" : "bg-muted text-muted-foreground"}`}>{n}/3</div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 min-h-5 text-sm" aria-live="polite">
        {busy && <span className="text-brand">{message}</span>}
        {error && <span role="alert" className="text-bad">{error}</span>}
        {done && <span className="text-ok">Fingerprint captured.</span>}
      </p>

      <div className="mt-2 flex gap-2">
        <Button type="button" onClick={start} disabled={disabled || busy} variant={done ? "outline" : "default"}>
          {busy ? "Scanning..." : done ? "Scan again" : "Start 3-scan enrollment"}
        </Button>
        {busy && <Button type="button" variant="ghost" onClick={() => bridge.cancel()}>Cancel</Button>}
        {done && <Button type="button" variant="ghost" onClick={() => { onTemplate(null); setCount(0); }}><X /> Remove</Button>}
      </div>
    </div>
  );
}
