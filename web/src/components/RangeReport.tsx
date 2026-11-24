"use client";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { DataTable } from "./DataTable";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "./skeletons";
import { peek, put } from "@/lib/client-cache";

const manilaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const addDays = (d: string, n: number) => { const [y, m, day] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10); };

/**
 * Shared filter bar + table + CSV button for the attendance history and the reports.
 * `endpoint` is the API path; `extra` adds report-specific query parameters.
 */
export function RangeReport({
  endpoint, defaultDays, extra = {}, showRange = true, showSearch = false, showGroup = false,
}: {
  endpoint: string; defaultDays: number; extra?: Record<string, string>;
  showRange?: boolean; showSearch?: boolean; showGroup?: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("day");
  const [table, setTable] = useState<{ headers: string[]; rows: (string | number)[][] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setTimeout(() => { const t = manilaToday(); setTo(t); setFrom(addDays(t, -(defaultDays - 1))); }, 0);
    return () => clearTimeout(id);
  }, [defaultDays]);

  const params = (csv = false) => {
    const p = new URLSearchParams({ ...extra });
    if (showRange) { p.set("from", from); p.set("to", to); }
    if (showSearch && q) p.set("q", q);
    if (showGroup) p.set("group", group);
    if (csv) p.set("format", "csv");
    return p.toString();
  };

  useEffect(() => {
    if (showRange && (!from || !to)) return;
    const t = setTimeout(async () => {
      const key = `admin:report:${endpoint}?${params()}`;
      const cached = peek<{ headers: string[]; rows: (string | number)[][] }>(key);
      if (cached) setTable(cached); // show the last result while the fresh one loads
      const res = await fetch(`${endpoint}?${params()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not load."); setTable(null); return; }
      setError(""); setTable(put(key, { headers: data.headers as string[], rows: data.rows as (string | number)[][] }));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, from, to, q, group, JSON.stringify(extra)]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {showRange && (
          <>
            <div className="space-y-1.5"><Label htmlFor="from" className="text-xs text-muted-foreground">From</Label><Input id="from" type="date" className="h-9 w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="to" className="text-xs text-muted-foreground">To</Label><Input id="to" type="date" className="h-9 w-40" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
          </>
        )}
        {showGroup && (
          <div className="space-y-1.5">
            <Label htmlFor="group" className="text-xs text-muted-foreground">Group by</Label>
            <select id="group" value={group} onChange={(e) => setGroup(e.target.value)}
              className="h-9 w-32 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
            </select>
          </div>
        )}
        {showSearch && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 w-56 pl-9" placeholder="Search member..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search member" />
          </div>
        )}
        <a href={`${endpoint}?${params(true)}`} className={buttonVariants({ variant: "outline", className: "ml-auto bg-card" })}>Export CSV</a>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-bad">{error}</p>}
      {table ? <DataTable headers={table.headers} rows={table.rows} /> : !error && <TableSkeleton rows={4} />}
      {table && <p className="mt-2 text-xs text-muted-foreground">{table.rows.length} row(s)</p>}
    </div>
  );
}
