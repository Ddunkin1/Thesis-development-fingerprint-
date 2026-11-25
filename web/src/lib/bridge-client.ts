// Browser-side helper for the local Fingerprint Bridge (http://localhost:5055 on the gym PC).
// The browser talks to the bridge directly; the bridge only talks to the web app's /api/bridge/templates.
export const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5055";

export interface BridgeStatus {
  scannerConnected: boolean;
  scannerError: string | null;
  scannerPluggedIn?: boolean | null; // Windows sees the scanner (it may still be reconnecting)
  scannerReady?: boolean;            // connected AND fingerprints loaded: only then can check-in work
  lastSyncOk?: boolean;              // last fingerprint download from the website worked
  lastScanAt?: string | null;        // when the last finger was scanned
  lastScan?: string;                 // what that scan was ("Matched user 4", "No match", ...)
  lastSyncAt?: string | null;        // when fingerprints were last downloaded
  lastSyncMessage?: string;
  templatesLoaded: number;
}

export type BridgeResult<T> = ({ ok: true } & T) | { ok: false; code: string; message: string; matchedUserId?: number | null };

/** Friendly texts for every error code the bridge (or a dead bridge) can produce. */
export const BRIDGE_MESSAGES: Record<string, string> = {
  bridge_offline: "The fingerprint program is not running on this PC. It normally restarts by itself within a few seconds; if not, open ChaqBridge from the Start menu.",
  scanner_disconnected: "The scanner is unplugged. Plug its USB cable back in; it reconnects by itself within a few seconds.",
  timeout: "No finger detected. Please try again.",
  poor_scan: "The scan was too faint. Press firmly and keep your finger still.",
  already_registered: "This finger is already registered to another member.",
  cancelled: "Scan cancelled.",
  starting: "The scanner is still loading the fingerprints. Please try again in a moment.",
};

async function call<T>(path: string, init?: RequestInit): Promise<BridgeResult<T>> {
  try {
    const res = await fetch(BRIDGE_URL + path, { ...init, cache: "no-store" });
    const data = await res.json();
    if (data && data.ok === false) return { ok: false, code: data.code ?? "error", message: BRIDGE_MESSAGES[data.code] ?? data.message ?? "Scan failed.", matchedUserId: data.matchedUserId };
    return data as BridgeResult<T>;
  } catch {
    return { ok: false, code: "bridge_offline", message: BRIDGE_MESSAGES.bridge_offline };
  }
}

export const bridge = {
  status: () => call<BridgeStatus>("/status"),
  progress: () => call<{ active: boolean; count: number; total: number; message: string }>("/enroll/progress"),
  /** Captures 3 scans and returns the merged template (base64). Pass userId when re-enrolling an existing member. */
  enroll: (userId?: number) =>
    call<{ template: string; length: number }>("/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId ?? null }),
    }),
  /** Waits for one scan; status is "matched" | "no_match" | "timeout". */
  identify: () =>
    call<{ status: "matched" | "no_match" | "timeout"; userId: number | null; score: number | null; proof?: string | null }>("/identify", { method: "POST" }),
  /** Ask the bridge to re-download templates now (call after saving an enrollment). */
  sync: () => call<{ templatesLoaded: number }>("/sync", { method: "POST" }),
  cancel: () => call<object>("/cancel", { method: "POST" }),
};
