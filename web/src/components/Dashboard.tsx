"use client";
import { ArrowRight, Fingerprint, RefreshCw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import { BridgeBanner } from "./BridgeBanner";
import { PageHeader } from "./PageHeader";
import { initials } from "./admin/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useBridgeInfo, useBridgeStatus } from "@/lib/use-bridge-status";

interface FeedItem { name: string; username: string; isToday: boolean; day: string; checkIn: string; checkOut: string | null; minutes: number | null; sinceMin: number | null }
interface Data {
  today: string;
  members: { active: number; expiring: number; expired: number };
  checkinsToday: number; stillInGym: number; walkinsToday: number; incomeToday: number; incomeMonth: number; incomeYesterday: number;
  peakHourToday: string | null;
  feed: FeedItem[];
  peakHours: { hour: number; count: number }[];
  attention: { id: number; name: string; expiryDate: string; status: "active" | "expiring" | "expired" }[];
}

const peso = (n: number) => "₱" + n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const hourFull = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const chartConfig = { count: { label: "Check-ins", color: "var(--chart-1)" } } satisfies ChartConfig;
const clock = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "none yet");
const since = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/** A plain titled block. No icon, no badge: the heading is enough. */
function Block({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-6 shadow-card ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold uppercase leading-none tracking-wide">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function FeedRow({ f }: { f: FeedItem }) {
  return (
    <li className="flex items-center gap-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-brand">{initials(f.name)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{f.name}</div>
        <div className="text-[0.8125rem] text-muted-foreground">
          {f.isToday ? "" : `${f.day} · `}in {f.checkIn}{f.checkOut ? `, out ${f.checkOut}` : ""}
        </div>
      </div>
      {f.minutes === null
        ? <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ok"><span className="size-2 rounded-full bg-ok" />in for {since(f.sinceMin ?? 0)}</span>
        : <span className="text-[0.8125rem] tabular-nums text-muted-foreground">{since(f.minutes)}</span>}
    </li>
  );
}

export function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const scanner = useBridgeStatus();
  const info = useBridgeInfo();

  const load = useCallback(async () => {
    setBusy(true);
    const res = await fetch("/api/admin/dashboard").catch(() => null);
    setBusy(false);
    if (res?.ok) { setD(await res.json()); setError(""); } else setError("Could not load the dashboard. Retrying...");
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 30_000); // keep the front-desk screen fresh
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  // "Wednesday, November 25": the date, written the way people say it (set after mount so it is never stale)
  const [dateText, setDateText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDateText(new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" }).format(new Date())), 0);
    return () => clearTimeout(t);
  }, []);

  const header = (
    <PageHeader title="Today" description={dateText || " "}>
      <button onClick={load} disabled={busy} aria-label="Refresh" title="Refresh now" className={buttonVariants({ variant: "outline", size: "icon", className: "bg-card" })}><RefreshCw className={busy ? "animate-spin" : ""} /></button>
      <Link href="/admin/register?mode=walkin" className={buttonVariants({ variant: "outline", className: "bg-card" })}><UserPlus /> Walk-in</Link>
      <Link href="/admin/register" className={buttonVariants()}>Register member</Link>
    </PageHeader>
  );

  if (!d) {
    return (
      <div>
        {header}
        <div className="space-y-4"><Skeleton className="h-56 w-full" /><Skeleton className="h-72 w-full" />{error && <p className="text-sm text-warn">{error}</p>}</div>
      </div>
    );
  }

  const chartData = d.peakHours.map((h) => ({ label: hourLabel(h.hour), count: h.count }));
  const peak = d.peakHours.reduce((a, b) => (b.count > a.count ? b : a));
  const delta = d.incomeToday - d.incomeYesterday;
  const today = d.feed.filter((f) => f.isToday);
  const earlier = d.feed.filter((f) => !f.isToday).slice(0, 5);

  return (
    <div className="min-w-0">
      {header}
      <div className="space-y-6">
        <BridgeBanner />
        {error && <p className="text-sm text-warn">{error}</p>}

        {/* ONE focus: who has come in today. The money is just a quiet list beside it. */}
        <section aria-label="Today" className="grid overflow-hidden rounded-xl border bg-card shadow-card lg:grid-cols-[1.25fr_1fr]">
          <div className="p-7">
            <div className="eyebrow">Checked in today</div>
            <div className="numeral mt-3 text-[7.5rem] leading-[0.8] text-brand">{d.checkinsToday}</div>
            <p className="mt-5 text-base text-muted-foreground">
              {d.checkinsToday === 0
                ? "Nobody has scanned in yet today."
                : <><b className="text-foreground">{d.stillInGym}</b> still in the gym{d.peakHourToday ? <>, busiest around <b className="text-foreground">{d.peakHourToday}</b></> : ""}.</>}
            </p>
          </div>
          <dl className="divide-y border-t text-base lg:border-l lg:border-t-0">
            <div className="flex items-baseline justify-between px-7 py-5"><dt className="text-muted-foreground">Walk-ins today</dt><dd className="numeral text-4xl">{d.walkinsToday}</dd></div>
            <div className="flex items-baseline justify-between gap-4 px-7 py-5">
              <dt className="text-muted-foreground">Income today
                {delta !== 0 && <span className={`ml-2 text-[0.8125rem] font-semibold ${delta > 0 ? "text-ok" : "text-bad"}`}>{delta > 0 ? "+" : "-"}{peso(Math.abs(delta))} vs yesterday</span>}
              </dt>
              <dd className="numeral text-4xl">{peso(d.incomeToday)}</dd>
            </div>
            <div className="flex items-baseline justify-between px-7 py-5"><dt className="text-muted-foreground">Income this month</dt><dd className="numeral text-4xl">{peso(d.incomeMonth)}</dd></div>
          </dl>
        </section>

        {/* members: three numbers in a row, each one opens the list already filtered */}
        <nav aria-label="Members" className="grid grid-cols-3 divide-x rounded-xl border bg-card shadow-card">
          {([
            ["Active members", d.members.active, "active", "text-ok"],
            ["Expiring within 3 days", d.members.expiring, "expiring", d.members.expiring ? "text-warn" : ""],
            ["Expired", d.members.expired, "expired", d.members.expired ? "text-bad" : ""],
          ] as const).map(([label, n, status, tone]) => (
            <Link key={status} href={`/admin/members?status=${status}`} className="group px-6 py-5 transition-colors hover:bg-accent/60">
              <div className={`numeral text-5xl ${tone}`}>{n}</div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-foreground">{label}<ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></div>
            </Link>
          ))}
        </nav>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
          <Block title="Who's in the gym" right={<Link href="/admin/attendance" className="text-sm font-semibold text-brand hover:underline">Full history</Link>}>
            {today.length === 0 && earlier.length === 0 && <p className="py-6 text-muted-foreground">No check-ins yet. They show up here the moment someone scans in.</p>}
            {today.length > 0 && <ul className="divide-y">{today.map((f, i) => <FeedRow key={`t${i}`} f={f} />)}</ul>}
            {today.length === 0 && earlier.length > 0 && <p className="pb-2 text-muted-foreground">Nobody yet today. Most recent visits:</p>}
            {earlier.length > 0 && (
              <>
                {today.length > 0 && <div className="eyebrow mb-1 mt-4">Earlier</div>}
                <ul className="divide-y">{earlier.map((f, i) => <FeedRow key={`e${i}`} f={f} />)}</ul>
              </>
            )}
          </Block>

          <div className="space-y-6">
            <Block title="Renewals due">
              {d.attention.length === 0 ? (
                <p className="text-muted-foreground">Nobody to chase this week.</p>
              ) : (
                <ul className="divide-y">
                  {d.attention.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="truncate font-semibold">{m.name}</span>
                      <span className={`shrink-0 text-[0.8125rem] font-semibold ${m.status === "expired" ? "text-bad" : "text-warn"}`}>{m.status === "expired" ? "expired" : "expires"} {m.expiryDate.slice(5)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/members" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">Open the members list <ArrowRight className="size-3.5" /></Link>
            </Block>

            <Block title="Scanner">
              <div className="flex items-center gap-3">
                <span className={`size-3 shrink-0 rounded-full ${scanner === "ok" ? "bg-ok" : scanner === "loading" ? "bg-muted-foreground" : "animate-pulse bg-bad"}`} />
                <div className="min-w-0">
                  <div className="font-semibold">
                    {{ loading: "Checking…", ok: "Ready", scanner_off: "Unplugged", reconnecting: "Reconnecting", sync_error: "Fingerprints not loaded", bridge_off: "Not running" }[scanner]}
                  </div>
                  <div className="text-[0.8125rem] text-muted-foreground">
                    {info ? <>{info.templatesLoaded} fingerprint{info.templatesLoaded === 1 ? "" : "s"} loaded · last scan {clock(info.lastScanAt)}</> : "Waiting for the bridge…"}
                  </div>
                </div>
                <Fingerprint className="ml-auto size-5 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            </Block>
          </div>
        </div>

        <Block title="Busy hours" right={<span className="text-sm text-muted-foreground">{peak.count > 0 ? <>last 30 days · busiest <b className="text-foreground">{hourFull(peak.hour)}</b></> : "last 30 days"}</span>}>
          <ChartContainer config={chartConfig} className="h-44 w-full">
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fontSize: 13 }} />
              <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={3}>
                {chartData.map((c, i) => <Cell key={i} fill={c.count > 0 && c.count === peak.count ? "var(--chart-1)" : "var(--chart-3)"} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
          {peak.count === 0 && <p className="text-sm text-muted-foreground">The chart fills in as members check in.</p>}
        </Block>
      </div>
    </div>
  );
}
