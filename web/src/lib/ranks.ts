// Member rank titles, earned by total visits. Pure and tiny, so it can be explained in one sentence:
// "the more you show up, the higher your title".
export const RANKS = [
  { name: "Rookie", from: 0 },
  { name: "Regular", from: 10 },
  { name: "Grinder", from: 30 },
  { name: "Beast", from: 60 },
  { name: "Legend", from: 100 },
] as const;

export interface RankInfo {
  name: string;
  next: { name: string; at: number; remaining: number } | null; // null once the top rank is reached
  progress: number;                                            // 0..1 towards the next rank (1 at the top)
}

export function rankFor(totalVisits: number): RankInfo {
  let i = 0;
  RANKS.forEach((r, idx) => { if (totalVisits >= r.from) i = idx; });
  const cur = RANKS[i];
  const next = RANKS[i + 1];
  if (!next) return { name: cur.name, next: null, progress: 1 };
  return {
    name: cur.name,
    next: { name: next.name, at: next.from, remaining: next.from - totalVisits },
    progress: (totalVisits - cur.from) / (next.from - cur.from),
  };
}
