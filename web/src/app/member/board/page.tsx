"use client";
import { EyeOff, Flame } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/use-api";
import type { getBoard } from "@/services/member-portal-service";

type Board = Awaited<ReturnType<typeof getBoard>>;
type Row = Board["top"][number];

function RowItem({ r }: { r: Row }) {
  return (
    <li className={`flex items-center gap-4 px-4 py-3 ${r.isMe ? "bg-brand/10" : ""}`}>
      <span className={`numeral w-9 text-center text-4xl ${r.rank === 1 ? "text-brand" : "text-muted-foreground"}`}>{r.rank}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{r.name}{r.isMe && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 align-middle text-[0.75rem] font-bold uppercase tracking-wider text-primary-foreground">You</span>}</div>
        <div className="text-xs text-muted-foreground">{r.visits} visit{r.visits === 1 ? "" : "s"} this month</div>
      </div>
      <div className="numeral flex items-center gap-1 text-3xl text-brand"><Flame className="size-5" />{r.best}</div>
    </li>
  );
}

export default function BoardPage() {
  const { data: b, error } = useApi<Board>("/api/member/leaderboard");
  const monthLabel = b ? new Date(`${b.month}-01T00:00:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric" }) : "";

  return (
    <main className="space-y-5">
      <header>
        <div className="eyebrow">{monthLabel || "This month"}</div>
        <h1 className="font-display text-5xl font-bold uppercase leading-none">Leaderboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ranked by best streak this month.</p>
      </header>

      {!b ? (
        <div className="space-y-3"><Skeleton className="h-20 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" />{error && <p role="alert" className="text-sm text-bad">{error}</p>}</div>
      ) : (
        <>
          {/* where am I? one clear sentence, with a push to climb */}
          <section className="rounded-2xl border border-brand/40 bg-brand/5 p-4" aria-label="Your rank">
            {b.hidden ? (
              <div className="flex items-start gap-2 text-sm">
                <EyeOff className="mt-0.5 size-4 shrink-0" />
                <p>You are hidden from the board. Turn it on in <Link href="/member/me" className="font-semibold text-brand underline">Me</Link> to compete.</p>
              </div>
            ) : b.me ? (
              <div className="flex items-center gap-4">
                <div className="numeral text-6xl text-brand">#{b.me.rank}</div>
                <p className="text-sm leading-snug">
                  {b.me.rank === 1 ? <>You are <b>on top</b> this month. Keep it up!</>
                    : b.me.gap === 0 ? <>You are tied with <b>{b.me.aboveName}</b>. One more day wins it.</>
                    : <><b>{b.me.gap} streak day{b.me.gap === 1 ? "" : "s"}</b> behind <b>{b.me.aboveName}</b>. You can catch up.</>}
                </p>
              </div>
            ) : (
              <p className="text-sm">Check in at the gym this month to join the board.</p>
            )}
          </section>

          {b.top.length === 0 ? (
            <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Nobody has checked in this month yet. Be the first.</p>
          ) : (
            <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
              {b.top.map((r) => <RowItem key={r.rank} r={r} />)}
              {b.me && b.me.rank > 10 && (<><li className="px-4 py-1 text-center text-muted-foreground">⋮</li><RowItem r={b.me} /></>)}
            </ol>
          )}
          <p className="text-center text-xs text-muted-foreground">Names show first name and last initial only.</p>
        </>
      )}
    </main>
  );
}
