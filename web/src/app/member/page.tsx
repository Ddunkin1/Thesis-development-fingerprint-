"use client";
import { Target } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeekTiles } from "@/components/WeekTiles";
import { BadgeCelebration } from "@/components/member/BadgeCelebration";
import { GoalCard } from "@/components/member/GoalCard";
import { StreakHero } from "@/components/member/StreakHero";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/use-api";
import type { getPortal } from "@/services/member-portal-service";

type Portal = Awaited<ReturnType<typeof getPortal>>;

const STATUS = {
  active: { label: "Active", cls: "border-ok/50 text-ok" },
  expiring: { label: "Expiring soon", cls: "border-warn/50 text-warn" },
  expired: { label: "Expired", cls: "border-bad/50 text-bad" },
  none: { label: "No plan", cls: "text-muted-foreground" },
} as const;

export default function MemberHome() {
  const { data: p, error } = useApi<Portal>("/api/member/me");

  return (
    <main className="space-y-5">
      <header className="flex items-center justify-between">
        <Brand size="sm" />
        <ThemeToggle compact />
      </header>

      {!p ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full rounded-2xl" /><Skeleton className="h-24 w-full" />
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        </div>
      ) : (
        <>
          <div>
            <div className="eyebrow !text-brand">{p.rank.name}</div>
            <h1 className="font-display text-5xl font-bold uppercase leading-none">Hi, {p.firstName}</h1>
          </div>

          <StreakHero current={p.streak.current} level={p.streak.level} checkedInToday={p.checkedInToday} />
          <WeekTiles week={p.streak.week} />
          <GoalCard goal={p.goal} />
          <BadgeCelebration badges={p.badges} username={p.username} />

          {/* what to do next: always one clear goal */}
          {p.nextBadge && (
            <section className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-sm">
                <Target className="size-4 text-brand" />
                <span><b>{p.nextBadge.remaining} more {p.nextBadge.unit}{p.nextBadge.remaining === 1 ? "" : "s"}</b> to <b className="text-brand">{p.nextBadge.label}</b></span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(p.nextBadge.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(4, p.nextBadge.ratio * 100)}%` }} />
              </div>
            </section>
          )}

          <section aria-label="Your numbers" className="grid grid-cols-3 divide-x rounded-2xl border bg-card">
            {[["Visits", p.stats.totalVisits], ["This month", p.stats.thisMonth], ["Best streak", p.stats.bestStreak]].map(([label, value]) => (
              <div key={label} className="p-4 text-center">
                <div className="numeral text-4xl">{value}</div>
                <div className="eyebrow mt-2 !text-[0.75rem]">{label}</div>
              </div>
            ))}
          </section>

          {p.rank.next && (
            <p className="text-center text-sm text-muted-foreground">
              <b className="text-foreground">{p.rank.next.remaining} more visit{p.rank.next.remaining === 1 ? "" : "s"}</b> to reach <b className="text-brand">{p.rank.next.name}</b>
            </p>
          )}

          <section className="rounded-2xl border bg-card p-4" aria-label="Membership">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow">Membership</h2>
              <Badge variant="outline" className={STATUS[p.membership.status].cls}>{STATUS[p.membership.status].label}</Badge>
            </div>
            {p.membership.expiryDate ? (
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="numeral text-5xl">{Math.max(p.membership.daysLeft ?? 0, 0)}</div>
                  <div className="eyebrow mt-1 !text-[0.75rem]">days left</div>
                </div>
                <div className="text-right text-sm text-muted-foreground">Expires<br /><b className="text-foreground">{p.membership.expiryDate}</b></div>
              </div>
            ) : null}
            {p.membership.status === "expiring" && <p className="mt-3 text-sm text-warn">Almost up. Renew at the front desk to keep your streak going.</p>}
            {p.membership.status === "expired" && <p className="mt-3 text-sm text-bad">Your membership has ended. Please renew at the front desk.</p>}
          </section>
        </>
      )}
    </main>
  );
}
