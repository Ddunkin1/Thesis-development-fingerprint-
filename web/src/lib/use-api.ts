"use client";
import { useEffect, useState } from "react";
import { peek, put } from "./client-cache";

/** Loads JSON from an API route. A 401/403 (session ended) sends the member back to the login page. */
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(() => peek<T>(url)); // a cached copy shows instantly, then refreshes
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(url).catch(() => null);
      if (!alive) return;
      if (!res) { setError("You seem to be offline. Check your connection."); return; }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full page load on purpose: clears all member state
      if (res.status === 401 || res.status === 403) { window.location.href = "/login"; return; }
      if (!res.ok) { setError("Could not load this screen. Please try again."); return; }
      setData(put(url, (await res.json()) as T));
      setError("");
    })();
    return () => { alive = false; };
  }, [url]);

  return { data, error, setData };
}

