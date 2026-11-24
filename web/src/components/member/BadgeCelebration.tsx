"use client";
import { useEffect, useState } from "react";
import { BadgeIcon } from "@/components/BadgeIcon";
import { Button } from "@/components/ui/button";

interface B { key: string; label: string; description: string; isNew: boolean }

// 18 confetti pieces with fixed positions, so the layout is the same on every render
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37 + 8) % 100}%`, delay: `${(i % 6) * 0.15}s`, duration: `${2.4 + (i % 5) * 0.35}s`,
  color: ["#6366f1", "#a855f7", "#fb923c", "#34d399", "#fbbf24", "#818cf8"][i % 6],
}));

/**
 * "New badge unlocked!" moment. It shows once per badge, the next time the member opens the app after earning it
 * (remembered in this browser, so it never repeats). Badges earned over a week ago are not celebrated.
 */
export function BadgeCelebration({ badges, username }: { badges: B[]; username: string }) {
  const KEY = `chaq-seen-badges:${username}`;
  const [queue, setQueue] = useState<B[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      let seen: string[] = [];
      try { seen = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { /* private mode: just show it */ }
      setQueue(badges.filter((b) => b.isNew && !seen.includes(b.key)));
    }, 500);
    return () => clearTimeout(t);
  }, [badges, KEY]);

  const current = queue[0];
  if (!current) return null;

  function dismiss() {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      localStorage.setItem(KEY, JSON.stringify([...seen, current.key]));
    } catch { /* ignore */ }
    setQueue((q) => q.slice(1)); // next unseen badge, if any
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`New badge: ${current.label}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-6 backdrop-blur-sm">
      {CONFETTI.map((c, i) => (
        <span key={i} aria-hidden className="confetti absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.duration }} />
      ))}
      <div className="pop-in relative w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-pop">
        <div className="eyebrow !text-brand">New badge unlocked</div>
        <div className="tile-l4 mx-auto mt-5 flex size-28 items-center justify-center rounded-full">
          <BadgeIcon badgeKey={current.key} className="size-14" />
        </div>
        <h2 className="mt-5 font-display text-5xl font-extrabold uppercase leading-none">{current.label}</h2>
        <p className="mt-3 text-base text-muted-foreground">{current.description}</p>
        {queue.length > 1 && <p className="mt-3 text-sm font-semibold text-brand">+{queue.length - 1} more to see</p>}
        <Button autoFocus className="mt-6 h-12 w-full rounded-xl font-display text-xl font-extrabold uppercase" onClick={dismiss}>Awesome!</Button>
      </div>
    </div>
  );
}
