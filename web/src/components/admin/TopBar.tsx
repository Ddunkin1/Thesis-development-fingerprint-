"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const fmtDate = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/** Initials for the avatar: "Gym Administrator" -> "GA". */
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

/** Top bar (desktop): live Manila date and time, a quick member search, and the signed-in user's avatar. */
export function TopBar({ name }: { name: string }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null); // set after mount: a prerendered clock would be stale
  const [q, setQ] = useState("");

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  return (
    <div className="sticky top-0 z-30 hidden items-center gap-4 border-b bg-background px-8 py-3 md:flex">
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-[0.8125rem] font-medium" aria-label="Current date and time">
        {now ? <>{fmtDate.format(now)} · {fmtTime.format(now)} PHT</> : <span className="opacity-0">Nov 25, 2026 · 12:00 AM PHT</span>}
      </div>

      <form className="relative ml-auto w-full max-w-sm" role="search"
        onSubmit={(e) => { e.preventDefault(); router.push(`/admin/members${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }}>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quick search member…" aria-label="Quick search member"
          className="h-10 w-full rounded-lg border bg-card pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" />
      </form>

      <span title={name} className="flex size-10 items-center justify-center rounded-lg bg-accent text-sm font-bold text-brand">{initials(name)}</span>
    </div>
  );
}
