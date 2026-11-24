"use client";
import { useSyncExternalStore } from "react";
import { bridge } from "./bridge-client";

/**
 *  ok          bridge running, scanner connected AND fingerprints loaded (check-in works)
 *  scanner_off bridge running but the scanner is unplugged / not detected
 *  reconnecting scanner plugged back in; the bridge is starting it and loading the fingerprints (a few seconds)
 *  sync_error  scanner connected but the fingerprints could not be downloaded from the website
 *  bridge_off  nothing answers on the bridge port (program closed or restarting)
 */
export type BridgeState = "loading" | "ok" | "scanner_off" | "reconnecting" | "sync_error" | "bridge_off";

/** What to tell people (front desk or admin) for each problem. Shared by the banner, the indicator and the kiosk. */
export const PROBLEM_TEXT: Record<"scanner_off" | "reconnecting" | "sync_error" | "bridge_off", { title: string; help: string }> = {
  sync_error: {
    title: "Fingerprints not loaded",
    help: "The scanner is ready but its fingerprints could not be downloaded from the website. Check that the website is running and the bridge key matches.",
  },
  reconnecting: {
    title: "Scanner reconnecting",
    help: "Getting the scanner ready and loading the fingerprints. This takes a few seconds, then check-in works again by itself.",
  },
  scanner_off: {
    title: "Scanner not connected",
    help: "The fingerprint scanner is unplugged. Plug its USB cable back in: it reconnects by itself within a few seconds.",
  },
  bridge_off: {
    title: "Check-in is offline",
    help: "The fingerprint program is not running on this PC. It normally restarts by itself within a few seconds. If this stays, open ChaqBridge from the Start menu.",
  },
};

// ---- ONE shared poller for the whole page ----------------------------------------------------------------------
// The sidebar light, the banner and the kiosk all read this same value, so they always change together and the
// browser asks the bridge only once per tick. It polls every second while something is wrong (so the short
// "reconnecting" step is never missed) and every 3 seconds when all is fine.
let current: BridgeState = "loading";
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;

async function poll() {
  const s = await bridge.status();
  if (!running) return; // everyone unsubscribed while we were waiting
  let next: BridgeState;
  if (!s.ok) next = "bridge_off";
  else if (s.scannerReady ?? s.scannerConnected) next = "ok";
  else if (!s.scannerConnected) next = s.scannerPluggedIn === true ? "reconnecting" : "scanner_off";
  else next = s.lastSyncOk === false ? "sync_error" : "reconnecting"; // connected, fingerprints still loading
  if (next !== current) { current = next; listeners.forEach((l) => l()); }
  timer = setTimeout(poll, next === "ok" ? 3000 : 1000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!running) { running = true; poll(); }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) { running = false; clearTimeout(timer); }
  };
}

export function useBridgeStatus(): BridgeState {
  return useSyncExternalStore(subscribe, () => current, () => "loading" as BridgeState);
}
