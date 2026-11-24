"use client";
import { PlugZap, Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { bridge, BRIDGE_MESSAGES } from "@/lib/bridge-client";

/** Polls the bridge; shows a clear banner when it is not running or the scanner is unplugged. */
export function BridgeBanner({ className = "" }: { className?: string }) {
  const [problem, setProblem] = useState<{ text: string; scanner: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    async function check() {
      const s = await bridge.status();
      if (!alive) return;
      if (!s.ok) setProblem({ text: s.message, scanner: false });
      else if (!s.scannerConnected) setProblem({ text: BRIDGE_MESSAGES.scanner_disconnected, scanner: true });
      else setProblem(null);
    }
    check();
    const t = setInterval(check, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!problem) return null;
  const Icon = problem.scanner ? Fingerprint : PlugZap;
  return (
    <div role="alert" className={`flex items-center gap-3 rounded-md border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad ${className}`}>
      <Icon className="size-4 shrink-0" /> {problem.text}
    </div>
  );
}
