"use client";
import { useEffect } from "react";

/**
 * When the browser brings a page back from its memory with Back or Forward, nothing is re-checked. Reloading makes
 * the server decide again who may see it (for example after signing out).
 */
export function HistoryGuard() {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) window.location.reload(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return null;
}
