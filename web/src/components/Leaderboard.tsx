"use client";
import { Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Row { userId: number; name: string; bestStreak: number; currentStreak: number; visits: number }

export function Leaderboard() {
  const [month, setMonth] = useState(""); // "" = current month
  const [data, setData] = useState<{ month: string; rows: Row[] } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/leaderboard${month ? `?month=${month}` : ""}`).then((r) => (r.ok ? r.json() : null)).then(setData);
  }, [month]);

  return (
    <div>
      <div className="mb-5 max-w-48 space-y-1.5">
        <Label htmlFor="month" className="text-xs text-muted-foreground">Month</Label>
        <Input id="month" type="month" className="h-9" value={month || data?.month || ""} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {!data && <Skeleton className="h-48 w-full" />}
      {data?.rows.length === 0 && <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No attendance this month yet.</p>}
      <ol className="divide-y rounded-xl border bg-card">
        {data?.rows.map((r, i) => (
          <li key={r.userId} className="flex items-center gap-4 px-4 py-3">
            <span className={`numeral w-10 text-center text-4xl ${i === 0 ? "text-brand" : "text-muted-foreground"}`}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.visits} visit(s) · current streak {r.currentStreak}</div>
            </div>
            <div className="numeral flex items-center gap-1 text-3xl text-brand"><Flame className="size-6" />{r.bestStreak}</div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">Ranked by best streak in the month. Members can opt out of the leaderboard; opted-out members are never listed.</p>
    </div>
  );
}
