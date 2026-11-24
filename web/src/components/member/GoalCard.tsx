import { Flag } from "lucide-react";

interface Goal { target: number; done: number; remaining: number; daysLeft: number; reached: boolean; onTrack: boolean; percent: number }

/** Monthly goal ring: "visit N times this month". Resets on the 1st, so there is always something new to chase. */
export function GoalCard({ goal }: { goal: Goal }) {
  const r = 44, c = 2 * Math.PI * r;
  const message = goal.reached
    ? <><b className="text-ok">Goal reached!</b> Every visit from here is a bonus.</>
    : goal.onTrack
      ? <><b>{goal.remaining} more visit{goal.remaining === 1 ? "" : "s"}</b> in {goal.daysLeft} day{goal.daysLeft === 1 ? "" : "s"}. You can do it.</>
      : <><b>{goal.remaining} visits</b> in {goal.daysLeft} day{goal.daysLeft === 1 ? "" : "s"} is a stretch. Give it a go, a fresh goal starts on the 1st.</>;
  return (
    <section aria-label="Monthly goal" className="flex items-center gap-5 rounded-2xl border bg-card p-4 shadow-card">
      <div className="relative size-28 shrink-0" role="img" aria-label={`${goal.done} of ${goal.target} visits this month`}>
        <svg viewBox="0 0 108 108" className="size-full -rotate-90">
          <circle cx="54" cy="54" r={r} fill="none" strokeWidth="10" className="stroke-accent" />
          <circle cx="54" cy="54" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c - (c * goal.percent) / 100} className={`transition-[stroke-dashoffset] duration-700 ${goal.reached ? "stroke-ok" : "stroke-primary"}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="numeral text-3xl">{goal.done}<span className="text-xl text-muted-foreground">/{goal.target}</span></span>
          <span className="eyebrow !text-[0.75rem]">visits</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="eyebrow flex items-center gap-1.5 !text-brand"><Flag className="size-3.5" /> Monthly goal</div>
        <p className="mt-2 text-sm leading-snug">{message}</p>
      </div>
    </section>
  );
}
