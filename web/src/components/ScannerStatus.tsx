"use client";
import { PROBLEM_TEXT, useBridgeStatus } from "@/lib/use-bridge-status";

/** Small always-visible indicator in the admin menu: staff can see at a glance whether check-in works. */
export function ScannerStatus({ className = "" }: { className?: string }) {
  const state = useBridgeStatus();
  const view = {
    loading: { dot: "bg-muted-foreground", text: "Checking scanner…", tip: "" },
    ok: { dot: "bg-ok", text: "Scanner ready", tip: "Fingerprint check-in is working." },
    scanner_off: { dot: "bg-bad animate-pulse", text: "Scanner unplugged", tip: PROBLEM_TEXT.scanner_off.help },
    reconnecting: { dot: "bg-warn animate-pulse", text: "Scanner reconnecting…", tip: PROBLEM_TEXT.reconnecting.help },
    sync_error: { dot: "bg-bad", text: "Fingerprints not loaded", tip: PROBLEM_TEXT.sync_error.help },
    bridge_off: { dot: "bg-bad animate-pulse", text: "Check-in offline", tip: PROBLEM_TEXT.bridge_off.help },
  }[state];
  return (
    <div title={view.tip} role="status" className={`flex items-center gap-2 rounded-md border px-3.5 py-2.5 text-[0.8125rem] font-medium ${className}`}>
      <span className={`size-2 shrink-0 rounded-full ${view.dot}`} aria-hidden />
      {view.text}
    </div>
  );
}
