import { ArrowDownRight, ArrowUpRight, Clock, Flame, Hourglass, Minus, Sun } from "lucide-react";

interface Recap {
  monthLabel: string; lastMonthLabel: string; visits: number; visitsLastMonth: number;
  bestStreak: number; hours: number; avgMinutes: number; sessions: number; usualTime: string | null;
}

/** "Your November": the member's own numbers for the month, compared with last month. */
export function MonthRecap({ recap: r }: { recap: Recap }) {
  const diff = r.visits - r.visitsLastMonth;
  const Trend = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? "text-ok" : diff < 0 ? "text-bad" : "text-muted-foreground";
  const cell = "rounded-xl bg-accent/60 p-4";
  return (
    <section aria-label={`Your ${r.monthLabel}`}>
      <h2 className="eyebrow mb-3">Your {r.monthLabel}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className={cell}>
          <div className="eyebrow !text-[0.75rem]">Visits</div>
          <div className="numeral mt-2 text-5xl">{r.visits}</div>
          <div className={`mt-2 flex items-center gap-1 text-[0.8125rem] font-semibold ${tone}`}>
            <Trend className="size-4" />{diff === 0 ? "Same as" : `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} than`} {r.lastMonthLabel}
          </div>
        </div>
        <div className={cell}>
          <div className="eyebrow flex items-center gap-1 !text-[0.75rem]"><Flame className="size-3.5" /> Best streak</div>
          <div className="numeral mt-2 text-5xl">{r.bestStreak}</div>
          <div className="mt-2 text-[0.8125rem] text-muted-foreground">day{r.bestStreak === 1 ? "" : "s"} in a row</div>
        </div>
        <div className={cell}>
          <div className="eyebrow flex items-center gap-1 !text-[0.75rem]"><Hourglass className="size-3.5" /> Time trained</div>
          <div className="numeral mt-2 text-5xl">{r.hours}<span className="ml-1 font-display text-xl text-muted-foreground">HRS</span></div>
          <div className="mt-2 text-[0.8125rem] text-muted-foreground">{r.sessions ? `about ${r.avgMinutes} min per workout` : "shows once you check out"}</div>
        </div>
        <div className={cell}>
          <div className="eyebrow flex items-center gap-1 !text-[0.75rem]"><Sun className="size-3.5" /> Usual time</div>
          <div className="numeral mt-2 text-5xl">{r.usualTime ?? "-"}</div>
          <div className="mt-2 flex items-center gap-1 text-[0.8125rem] text-muted-foreground"><Clock className="size-3.5" />{r.usualTime ? "when you check in most" : "after a few visits"}</div>
        </div>
      </div>
    </section>
  );
}
