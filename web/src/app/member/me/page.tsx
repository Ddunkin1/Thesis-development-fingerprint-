"use client";
import { KeyRound, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BadgeIcon } from "@/components/BadgeIcon";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/use-api";
import type { getPortal } from "@/services/member-portal-service";

type Portal = Awaited<ReturnType<typeof getPortal>>;

/** Big on/off switch (easy to hit with a thumb). */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors ${on ? "border-brand-strong bg-brand-strong" : "bg-muted"}`}>
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.7rem]" : "left-0.5"}`} />
    </button>
  );
}

export default function MePage() {
  const { data: p, error, setData } = useApi<Portal>("/api/member/me");

  async function setVisible(show: boolean) {
    if (!p) return;
    setData({ ...p, leaderboardOptOut: !show });                 // update instantly, undo if the server says no
    const res = await fetch("/api/member/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leaderboardOptOut: !show }),
    }).catch(() => null);
    if (!res?.ok) { setData({ ...p, leaderboardOptOut: !show ? false : true }); toast.error("Could not save. Try again."); }
    else toast.success(show ? "You are on the leaderboard" : "You are hidden from the leaderboard");
  }

  return (
    <main className="space-y-6">
      <header>
        <div className="eyebrow">{p?.username ?? " "}</div>
        <h1 className="font-display text-5xl font-bold uppercase leading-none">{p?.fullName ?? "Me"}</h1>
      </header>

      {!p ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" />{error && <p role="alert" className="text-sm text-bad">{error}</p>}</div>
      ) : (
        <>
          <section aria-label="Badges">
            <h2 className="eyebrow mb-3">Badges · {p.badges.filter((b) => b.earned).length} of {p.badges.length}</h2>
            <ul className="grid grid-cols-2 gap-3">
              {p.badges.map((b) => (
                <li key={b.key} className={`relative flex flex-col gap-2 rounded-2xl border p-4 ${b.earned ? "border-brand/50 bg-brand/5" : "opacity-60"}`}>
                  {b.isNew && <span className="pop-in absolute right-3 top-3 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>}
                  <span className={`flex size-12 items-center justify-center rounded-full ${b.earned ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>
                    {b.earned ? <BadgeIcon badgeKey={b.key} className="size-6" /> : <Lock className="size-5" />}
                  </span>
                  <div>
                    <div className="font-display text-xl font-bold uppercase leading-none">{b.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{b.earned ? `Earned ${b.earnedOn}` : b.hint}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Recent visits">
            <h2 className="eyebrow mb-3">Recent visits</h2>
            {p.visits.length === 0 ? <p className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">No visits yet. Scan in at the gym.</p> : (
              <ul className="divide-y rounded-2xl border">
                {p.visits.map((v, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium">{v.day}</span>
                    <span className="tabular-nums text-muted-foreground">{v.in}{v.out ? ` – ${v.out}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Settings" className="space-y-1 rounded-2xl border">
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="font-medium">Show me on the leaderboard</div>
                <div className="text-xs text-muted-foreground">Others see your first name and last initial.</div>
              </div>
              <Switch on={!p.leaderboardOptOut} onChange={setVisible} label="Show me on the leaderboard" />
            </div>
            <div className="flex items-center justify-between border-t p-4">
              <span className="font-medium">Theme</span>
              <ThemeToggle />
            </div>
            <Link href="/change-password" className="flex items-center gap-3 border-t p-4 font-medium"><KeyRound className="size-4 text-muted-foreground" /> Change password</Link>
          </section>

          <div className="flex justify-center"><LogoutButton /></div>
        </>
      )}
    </main>
  );
}
