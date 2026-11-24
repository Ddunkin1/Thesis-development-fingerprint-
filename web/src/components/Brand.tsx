"use client";
import { useEffect, useState } from "react";

/** Wordmark: condensed caps, accent on "GYM". */
export function Brand({ size = "lg" }: { size?: "sm" | "lg" | "xl" }) {
  const s = size === "xl" ? "text-6xl md:text-8xl" : size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div className={`font-display font-extrabold uppercase leading-none tracking-[0.1em] ${s}`}>
      Chaq <span className="text-brand">Gym</span>
    </div>
  );
}

/**
 * The square mark next to the wordmark. If the gym puts its own logo at web/public/logo.png it is used automatically;
 * until then a simple "CG" monogram is shown (no stock icon).
 */
export function BrandMark({ className = "size-11" }: { className?: string }) {
  const [hasLogo, setHasLogo] = useState(false);
  // Try to load the logo in the background; only if it really exists do we swap it in (so there is never a broken-image flash).
  useEffect(() => {
    const probe = new window.Image();
    probe.onload = () => setHasLogo(true);
    probe.src = "/logo.png";
  }, []);
  if (hasLogo) {
    // eslint-disable-next-line @next/next/no-img-element -- optional file loaded only when present
    return <img src="/logo.png" alt="Chaq Gym" className={`shrink-0 rounded-lg object-contain ${className}`} />;
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-primary font-display text-xl font-extrabold tracking-wider text-primary-foreground ${className}`} aria-hidden>
      CG
    </span>
  );
}
