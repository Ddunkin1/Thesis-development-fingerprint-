"use client";
import { clearCache } from "./client-cache";

export const PIN_HEADER = "x-admin-pin";

/** Show income, reports, the activity log and exports for a few minutes. Returns an error text, or null on success. */
export async function unlockFigures(pin: string): Promise<string | null> {
  const res = await fetch("/api/admin/pin/unlock", { method: "POST", headers: { [PIN_HEADER]: pin } }).catch(() => null);
  if (res?.ok) return null;
  const data = await res?.json().catch(() => ({}));
  return data?.error ?? "Could not check the PIN. Check the connection.";
}

/** Hide private figures at once and forget any copy kept in this tab. */
export async function lockFigures() {
  clearCache();
  await fetch("/api/admin/pin/unlock", { method: "DELETE" }).catch(() => null);
}
