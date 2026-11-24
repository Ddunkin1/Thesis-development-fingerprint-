import { Check, Flame, Snowflake } from "lucide-react";
import type { Tile } from "@/lib/streak-rules";

/**
 * The 7 day tiles (Mon-Sun). Purely presentational, so the Phase 2 member page can reuse it as-is.
 * gray = no workout, light purple = day 1, purple = 2-3, deep purple + flame = 4-5, glowing fire = 6+.
 */
export function WeekTiles({ week, big = false }: { week: Tile[]; big?: boolean }) {
  return (
    <div className={`grid grid-cols-7 ${big ? "gap-2 md:gap-3" : "gap-1.5"}`} role="list" aria-label="This week">
      {week.map((t) => {
        const icon = big ? "size-7 md:size-12" : "size-4";
        return (
          <div key={t.date} role="listitem"
            title={t.attended ? `${t.label}: streak day ${t.streak}` : t.frozen ? `${t.label}: rest day (freeze used)` : `${t.label}: no workout`}
            className={`tile-l${t.level} ${t.isToday ? "tile-today" : ""} flex flex-col items-center justify-center rounded-md
              ${big ? "h-24 gap-2 md:h-40" : "h-14 gap-1"}`}>
            <span className={`font-display font-semibold uppercase tracking-widest opacity-90 ${big ? "text-base md:text-2xl" : "text-[11px]"}`}>{t.label}</span>
            {t.level >= 3 ? <Flame className={`${icon} flame`} aria-hidden />
              : t.attended ? <Check className={icon} aria-hidden />
              : t.frozen ? <Snowflake className={icon} aria-hidden />
              : <span className={icon} />}
          </div>
        );
      })}
    </div>
  );
}
