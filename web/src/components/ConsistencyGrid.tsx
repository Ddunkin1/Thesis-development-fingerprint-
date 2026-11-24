import type { HistoryDay } from "@/lib/streak-rules";

/** 8-week consistency calendar (columns = weeks, rows = Mon..Sun), the "show history, not just a number" pattern. */
export function ConsistencyGrid({ days }: { days: HistoryDay[] }) {
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  const attended = days.filter((d) => d.attended).length;
  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={`${attended} visits in the last 8 weeks`}>
        {weeks.map((wk, i) => (
          <div key={i} className="flex flex-col gap-1">
            {wk.map((d) => (
              <div key={d.date} title={`${d.date}${d.attended ? " - visited" : d.frozen ? " - rest day" : ""}`}
                className={`size-4 rounded-[3px] ${d.future ? "bg-transparent" : d.attended ? "bg-brand" : d.frozen ? "bg-brand/25" : "bg-muted"}`} />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{attended} visit(s) in the last 8 weeks</p>
    </div>
  );
}
