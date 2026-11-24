"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import { BridgeBanner } from "./BridgeBanner";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface Data {
  today: string;
  members: { active: number; expiring: number; expired: number };
  checkinsToday: number; walkinsToday: number; incomeToday: number; incomeMonth: number;
  recent: { name: string; checkIn: string; checkOut: string | null }[];
  peakHours: { hour: number; count: number }[];
  attention: { id: number; name: string; expiryDate: string; status: "active" | "expiring" | "expired" }[];
}

const peso = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const chartConfig = { count: { label: "Check-ins", color: "var(--chart-1)" } } satisfies ChartConfig;

/** One scoreboard cell: small caps label, big condensed number. */
function Stat({ label, value, tone = "", currency = false }: { label: string; value: string | number; tone?: string; currency?: boolean }) {
  return (
    <div className="p-5">
      <div className="eyebrow">{label}</div>
      <div className={`numeral mt-3 text-5xl md:text-6xl ${tone}`}>{currency && <span className="mr-1.5 align-top font-sans text-xl font-medium text-muted-foreground">₱</span>}{value}</div>
    </div>
  );
}

export function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/admin/dashboard").catch(() => null);
      if (!alive) return;
      if (res?.ok) { setD(await res.json()); setError(""); } else setError("Could not load the dashboard. Retrying...");
    };
    load();
    const t = setInterval(load, 30_000); // keep the front-desk screen fresh
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
        {error && <p className="text-sm text-warn">{error}</p>}
      </div>
    );
  }

  const chartData = d.peakHours.map((h) => ({ label: hourLabel(h.hour), count: h.count }));
  const peak = d.peakHours.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <div className="min-w-0 space-y-6">
      <BridgeBanner />
      {error && <p className="text-sm text-warn">{error}</p>}

      {/* Scoreboard: hairline-divided cells instead of a grid of separate cards */}
      <section aria-label="Today and members" className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-card md:grid-cols-4 [&>*:nth-child(-n+2)]:border-t-0">
        <Stat label="Check-ins today" value={d.checkinsToday} tone="text-brand" />
        <Stat label="Walk-ins today" value={d.walkinsToday} />
        <Stat label="Income today" value={peso(d.incomeToday)} currency />
        <Stat label="Income this month" value={peso(d.incomeMonth)} currency />
        <Stat label="Active members" value={d.members.active} tone="text-ok" />
        <Stat label="Expiring (3 days)" value={d.members.expiring} tone="text-warn" />
        <Stat label="Expired" value={d.members.expired} tone="text-bad" />
        <Link href="/admin/members" className="group flex items-end justify-between p-5 text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          Manage members <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Peak hours · last 30 days</h2>
            {peak.count > 0 && <span className="text-sm text-muted-foreground">Busiest: <b className="text-foreground">{hourLabel(peak.hour)}</b></span>}
          </div>
          <ChartContainer config={chartConfig} className="mt-4 h-52 w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fontSize: 13 }} />
              <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={2}>
                {chartData.map((c, i) => <Cell key={i} fill={c.count > 0 && c.count === peak.count ? "var(--chart-2)" : "var(--chart-1)"} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
          {peak.count === 0 && <p className="text-sm text-muted-foreground">No check-ins recorded yet.</p>}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="eyebrow">Needs attention</h2>
          {d.attention.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nobody is expiring or expired.</p> : (
            <ul className="mt-3 divide-y text-sm">
              {d.attention.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="truncate font-medium">{m.name}</span>
                  <Badge variant="outline" className={m.status === "expired" ? "border-bad/50 text-bad" : "border-warn/50 text-warn"}>
                    {m.status === "expired" ? "Expired" : "Expires"} {m.expiryDate.slice(5)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/members" className="mt-4 inline-flex items-center gap-1 text-sm text-brand hover:underline">Open members to renew <ArrowRight className="size-3.5" /></Link>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Recent attendance</h2>
          <Link href="/admin/attendance" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">Full history <ArrowRight className="size-3.5" /></Link>
        </div>
        {d.recent.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No check-ins yet.</p> : (
          <ul className="mt-3 divide-y text-sm">
            {d.recent.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{a.name}</span>
                <span className="tabular-nums text-muted-foreground">in {a.checkIn}{a.checkOut ? ` · out ${a.checkOut}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
