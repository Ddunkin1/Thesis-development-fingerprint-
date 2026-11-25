"use client";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import { BridgeBanner } from "./BridgeBanner";
import { PageHeader } from "./PageHeader";
import { initials } from "./admin/TopBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { DashboardSkeleton } from "./skeletons";
import { PinDialog } from "./PinDialog";
import { lockFigures } from "@/lib/pin-client";
import { peek, put } from "@/lib/client-cache";
import { useBridgeInfo, useBridgeStatus } from "@/lib/use-bridge-status";

interface FeedItem { name: string; username: string; isToday: boolean; day: string; checkIn: string; checkOut: string | null; minutes: number | null; sinceMin: number | null }
interface Data {
  today: string;
  members: { active: number; expiring: number; expired: number };
  checkinsToday: number; stillInGym: number; walkinsToday: number;
  incomeToday: number | null; incomeMonth: number | null; incomeYesterday: number | null; // null until the PIN is typed
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
    <section className={`rounded-lg border bg-card p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function FeedRow({ f }: { f: FeedItem }) {
  return (
    <li className="flex items-center gap-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-brand">{initials(f.name)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{f.name}</div>
        <div className="text-[0.8125rem] text-muted-foreground">
          {f.isToday ? "" : `${f.day} · `}in {f.checkIn}{f.checkOut ? `, out ${f.checkOut}` : ""}
        </div>
      </div>
      {f.minutes === null
        ? <span className="rounded-md bg-ok-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-ok">in for {since(f.sinceMin ?? 0)}</span>
        : <span className="text-[0.8125rem] tabular-nums text-muted-foreground">{since(f.minutes)}</span>}
    </li>
  );
}

export function Dashboard() {
  const [d, setD] = useState<Data | null>(() => peek<Data>("admin:dashboard"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [needsPin, setNeedsPin] = useState(false); // true until a PIN has been created
  useEffect(() => {
    fetch("/api/admin/pin").then((r) => (r.ok ? r.json() : null)).then((p) => setNeedsPin(p ? !p.isSet : false)).catch(() => {});
  }, []);
  const scanner = useBridgeStatus();
  const info = useBridgeInfo();

  const load = useCallback(async () => {
    setBusy(true);
    const res = await fetch("/api/admin/dashboard").catch(() => null);
    setBusy(false);
    if (res?.ok) { setD(put("admin:dashboard", (await res.json()) as Data)); setError(""); } else setError("Could not load the dashboard. Retrying...");
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    // Keep the front-desk screen fresh, but only while it is being looked at, so an unused tab lets the database sleep.
    const t = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const back = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearTimeout(first); clearInterval(t); document.removeEventListener("visibilitychange", back); };
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
      <Link href="/admin/register?mode=walkin" className={buttonVariants({ variant: "outline", className: "bg-card" })}>Walk-in</Link>
      <Link href="/admin/register" className={buttonVariants()}>Register member</Link>
    </PageHeader>
  );

  if (!d) {
    return (
      <div>
        {header}
        <DashboardSkeleton />{error && <p className="mt-4 text-sm text-warn">{error}</p>}
      </div>
    );
  }

  const chartData = d.peakHours.map((h) => ({ label: hourLabel(h.hour), count: h.count }));
  const peak = d.peakHours.reduce((a, b) => (b.count > a.count ? b : a));
  const money = d.incomeToday !== null && d.incomeMonth !== null && d.incomeYesterday !== null;
  const delta = money ? d.incomeToday! - d.incomeYesterday! : 0;
  const today = d.feed.filter((f) => f.isToday);
  const earlier = d.feed.filter((f) => !f.isToday).slice(0, 5);

  return (
    <div className="min-w-0">
      {header}
      <div className="space-y-6">
        <BridgeBanner />
        {needsPin && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-warn-soft px-5 py-3">
            <span className="text-sm font-medium">Create your 4-digit PIN. You need it to renew or delete members and to see income.</span>
            <Link href="/admin/pin" className={buttonVariants({ size: "sm" })}>Create PIN</Link>
          </div>
        )}
        {error && <p className="text-sm text-warn">{error}</p>}

        <PinDialog open={askPin} onOpenChange={setAskPin} onUnlocked={load} what="Income stays visible for 5 minutes." />

        {/* ONE focus: who has come in today. Everything else is a compact strip underneath. */}
        <section aria-label="Today" className="flex flex-wrap items-end gap-x-10 gap-y-3 rounded-lg border bg-card px-7 py-6">
          <div>
            <div className="eyebrow">Checked in today</div>
            <div className="numeral mt-3 text-[7rem] leading-[0.8] text-brand">{d.checkinsToday}</div>
          </div>
          <p className="max-w-md pb-0.5 text-base text-muted-foreground">
            {d.checkinsToday === 0
              ? "Nobody has scanned in yet today."
              : <><b className="text-foreground">{d.stillInGym}</b> still in the gym{d.peakHourToday ? <>, busiest around <b className="text-foreground">{d.peakHourToday}</b></> : ""}.</>}
          </p>
        </section>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={async () => { if (money) { await lockFigures(); await load(); } else setAskPin(true); }}>
            {money ? "Hide income" : "Show income"}
          </Button>
        </div>

        <section aria-label="Summary" className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border ${money ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-4"}`}>
          {([
            ["Walk-ins today", String(d.walkinsToday), "", null],
            ["Income today", money ? peso(d.incomeToday!) : "", delta === 0 ? "" : `${delta > 0 ? "+" : "-"}${peso(Math.abs(delta))} vs yesterday`, null],
            ["Income this month", money ? peso(d.incomeMonth!) : "", "", null],
            ["Active members", String(d.members.active), "", "active"],
            ["Expiring in 3 days", String(d.members.expiring), "", "expiring"],
            ["Expired", String(d.members.expired), "", "expired"],
          ] as const).filter(([label]) => money || !label.startsWith("Income")).map(([label, value, note, status]) => {
            const tone = status === "expiring" && d.members.expiring ? "text-warn" : status === "expired" && d.members.expired ? "text-bad" : "";
            const inner = (
              <>
                <div className="text-[0.8125rem] text-muted-foreground">{label}</div>
                <div className={`numeral mt-1 text-4xl ${tone}`}>{value}</div>
                {note && <div className={`mt-1 text-[0.8125rem] ${delta > 0 ? "text-ok" : "text-bad"}`}>{note}</div>}
              </>
            );
            return status
              ? <Link key={label} href={`/admin/members?status=${status}`} className="bg-card px-5 py-4 transition-colors hover:bg-accent">{inner}</Link>
              : <div key={label} className="bg-card px-5 py-4">{inner}</div>;
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
          <Block title="Who's in the gym" right={<Link href="/admin/attendance" className="text-sm font-semibold text-brand hover:underline">Full history</Link>}>
            {today.length === 0 && earlier.length === 0 && <p className="py-3 text-muted-foreground">No check-ins yet today.</p>}
            {today.length > 0 && <ul className="divide-y">{today.map((f, i) => <FeedRow key={`t${i}`} f={f} />)}</ul>}
            {today.length === 0 && earlier.length > 0 && <p className="pb-2 text-muted-foreground">Nobody yet today. Most recent visits:</p>}
            {earlier.length > 0 && (
              <>
                {today.length > 0 && <div className="eyebrow mb-1 mt-4">Earlier visits</div>}
                <ul className="divide-y">{earlier.map((f, i) => <FeedRow key={`e${i}`} f={f} />)}</ul>
              </>
            )}
          </Block>

          <div className="space-y-6">
            <Block title="Renewals due">
              {d.attention.length === 0 ? (
                <p className="text-muted-foreground">No renewals due this week.</p>
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
              <Link href="/admin/members" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">All members</Link>
            </Block>

            <Block title="Scanner">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {{ loading: "Checking…", ok: "Ready", scanner_off: "Unplugged", reconnecting: "Reconnecting", sync_error: "Fingerprints not loaded", bridge_off: "Not running" }[scanner]}
                  </div>
                  <div className="text-[0.8125rem] text-muted-foreground">
                    {info ? <>{info.templatesLoaded} fingerprint{info.templatesLoaded === 1 ? "" : "s"} loaded · last scan {clock(info.lastScanAt)}</> : "Waiting for the bridge…"}
                  </div>
                </div>
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
          {peak.count === 0 && <p className="text-sm text-muted-foreground">No check-ins in the last 30 days.</p>}
        </Block>
      </div>
    </div>
  );
}
