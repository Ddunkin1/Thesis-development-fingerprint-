// Browser-side helper for the local Fingerprint Bridge (http://localhost:5055 on the gym PC).
// The browser talks to the bridge directly; the bridge only talks to the web app's /api/bridge/templates.
export const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5055";

export interface BridgeStatus {
  scannerConnected: boolean;
  scannerError: string | null;
  templatesLoaded: number;
}

export type BridgeResult<T> = ({ ok: true } & T) | { ok: false; code: string; message: string; matchedUserId?: number | null };

/** Friendly texts for every error code the bridge (or a dead bridge) can produce. */
export const BRIDGE_MESSAGES: Record<string, string> = {
  bridge_offline: "The fingerprint bridge is not running on this PC. Start ChaqBridge.exe and try again.",
  scanner_disconnected: "The scanner is not connected. Check the USB cable.",
  timeout: "No finger detected. Please try again.",
  poor_scan: "The scan was too faint. Press firmly and keep your finger still.",
  already_registered: "This finger is already registered to another member.",
  cancelled: "Scan cancelled.",
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
    call<{ status: "matched" | "no_match" | "timeout"; userId: number | null; score: number | null }>("/identify", { method: "POST" }),
  /** Ask the bridge to re-download templates now (call after saving an enrollment). */
  sync: () => call<{ templatesLoaded: number }>("/sync", { method: "POST" }),
  cancel: () => call<object>("/cancel", { method: "POST" }),
};
