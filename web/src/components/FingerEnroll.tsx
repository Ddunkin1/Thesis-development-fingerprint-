"use client";
import { Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bridge } from "@/lib/bridge-client";
import { Button } from "@/components/ui/button";

/** Circular progress ring with the fingerprint and a percentage in the middle (design: "enrollment ring"). */
function Ring({ percent, state }: { percent: number; state: "idle" | "busy" | "done" }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`Enrollment ${percent} percent`}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-accent" />
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100}
          className={`transition-[stroke-dashoffset] duration-500 ${state === "done" ? "stroke-ok" : "stroke-primary"}`} />
      </svg>
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card">
        <Fingerprint className={`size-9 ${state === "done" ? "text-ok" : state === "busy" ? "animate-pulse text-brand" : "text-muted-foreground"}`} />
        <span className="numeral mt-1 text-xl">{percent}%</span>
      </div>
    </div>
  );
}

/**
 * One finger's enrollment panel: runs the bridge's 3-scan enrollment and shows progress as a ring and three scan pills.
 * The captured template (base64) is handed to the parent; nothing is stored until the form is saved.
 */
export function FingerEnroll({
  label, hint, required = false, disabled, template, onTemplate, userId,
}: {
  label: string;
  hint?: string;
  required?: boolean;
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
  const percent = done ? 100 : Math.round((count / 3) * 100);
  return (
    <div className={`rounded-lg border p-5 ${done ? "border-ok/50 bg-ok-soft" : "bg-muted"}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Ring percent={percent} state={done ? "done" : busy ? "busy" : "idle"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold leading-none">{label}</h3>
            <span className={`text-[0.8125rem] font-semibold ${required ? "text-brand" : "text-muted-foreground"}`}>{required ? "Required" : "Optional"}</span>
          </div>
          {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}

          <div className="mt-4 grid grid-cols-3 gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={count} aria-label="Scan progress">
            {[1, 2, 3].map((n) => {
              const ok = count >= n;
              const active = busy && count + 1 === n;
              return (
                <div key={n} className={`flex h-12 flex-col items-center justify-center rounded-md text-center text-sm font-semibold leading-tight transition-colors
                  ${ok ? "bg-ok text-white" : active ? "animate-pulse bg-accent text-brand" : "bg-card text-muted-foreground"} ${ok || active ? "" : "border"}`}>
                  {ok ? <span>Scan {n}: OK</span> : <>Scan {n}<span className="text-[0.75rem] font-medium opacity-80">{active ? "Tap the lens" : "Waiting"}</span></>}
                </div>
              );
            })}
          </div>

          <p className="mt-3 min-h-5 text-sm" aria-live="polite">
            {busy && <span className="font-medium text-brand">{message}</span>}
            {error && <span role="alert" className="font-medium text-bad">{error}</span>}
            {done && <span className="font-medium text-ok">Fingerprint captured.</span>}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={start} disabled={disabled || busy} variant={done ? "outline" : "default"}>
              {busy ? "Scanning…" : done ? "Scan again" : "Start 3-scan enrollment"}
            </Button>
            {busy && <Button type="button" variant="ghost" onClick={() => bridge.cancel()}>Cancel</Button>}
            {done && <Button type="button" variant="ghost" onClick={() => { onTemplate(null); setCount(0); }}>Remove</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
