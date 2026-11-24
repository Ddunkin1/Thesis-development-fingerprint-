"use client";
import { Fingerprint, Loader2, PlugZap } from "lucide-react";
import { PROBLEM_TEXT, useBridgeStatus } from "@/lib/use-bridge-status";

/** Shown above admin pages that need the scanner. Appears when something is wrong, disappears by itself when fixed. */
export function BridgeBanner({ className = "" }: { className?: string }) {
  const state = useBridgeStatus();
  if (state === "loading" || state === "ok") return null;
  const Icon = state === "reconnecting" ? Loader2 : state === "scanner_off" ? Fingerprint : PlugZap;   // sync_error / bridge_off: plug icon
  const { title, help } = PROBLEM_TEXT[state];
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${state === "reconnecting" ? "border-warn/40 bg-warn/10 text-warn" : "border-bad/40 bg-bad/10 text-bad"} ${className}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${state === "reconnecting" ? "animate-spin" : ""}`} />
      <div><b className="font-semibold">{title}.</b> {help}</div>
    </div>
  );
}
