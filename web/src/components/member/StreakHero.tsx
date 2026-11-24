import { CheckCircle2, Flame } from "lucide-react";
import type { Level } from "@/lib/streak-rules";

/**
 * The main thing on the member's phone: the streak as a huge scoreboard number.
 * The card's colour is the streak level (neutral -> light orange -> orange -> deep orange + flame -> fire),
 * so the screen itself "heats up" as the streak grows.
 */
export function StreakHero({ current, level, checkedInToday }: { current: number; level: Level; checkedInToday: boolean }) {
  const message =
    current === 0 ? "Check in at the gym to start your streak."
    : checkedInToday ? "Locked in for today. See you tomorrow."
    : `Scan in today to keep your ${current}-day streak alive.`;
  return (
    <section aria-label="Current streak"
      className={`relative overflow-hidden rounded-2xl p-6 ${level === 0 ? "border bg-card" : `tile-l${level}`}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {checkedInToday
          ? <><CheckCircle2 className="size-4" /> Checked in today</>
          : <span className="opacity-80">Not checked in yet today</span>}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <Flame className={`size-20 shrink-0 ${level >= 3 ? "flame" : ""} ${level === 0 ? "text-muted-foreground" : ""}`} />
        <span className="numeral text-[9rem] leading-[0.78]">{current}</span>
      </div>
      <div className="eyebrow mt-3 !text-current opacity-80">day streak</div>
      <p className="mt-3 text-base leading-snug">{message}</p>
    </section>
  );
}
