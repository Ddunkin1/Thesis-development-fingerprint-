"use client";
import { ArrowRight, Banknote, BellRing, CalendarX2, CheckCircle2, DoorOpen, Fingerprint, RefreshCw, ShieldCheck, Timer, TrendingDown, TrendingUp, UserPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, Cell, XAxis } from "recharts";
import { BridgeBanner } from "./BridgeBanner";
import { initials } from "./admin/TopBar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBridgeInfo, useBridgeStatus } from "@/lib/use-bridge-status";
import { PageHeader } from "./PageHeader";

interface Data {
  today: string;
  members: { active: number; expiring: number; expired: number };
  checkinsToday: number; walkinsToday: number; incomeToday: number; incomeMonth: number; incomeYesterday: number;
  peakHourToday: string | null; avgWorkoutMinutes: number; avgWorkoutSessions: number;
  recent: { name: string; username: string; checkIn: string; checkOut: string | null; minutes: number | null }[];
  peakHours: { hour: number; count: number }[];
  attention: { id: number; name: string; expiryDate: string; status: "active" | "expiring" | "expired" }[];
}

const peso = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
const hourFull = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const chartConfig = { count: { label: "Check-ins", color: "var(--chart-1)" } } satisfies ChartConfig;
const clock = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(iso)) : "none yet");

/** KPI card from the design: label, big number, small icon tile, one line of context. */
function Kpi({ label, value, tone = "", icon: Icon, tile, note, currency = false }: {
  label: string; value: string | number; tone?: string; icon: React.ElementType; tile: string; note: React.ReactNode; currency?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{label}</div>
          <div className={`numeral mt-3 text-[3.25rem] ${tone}`}>{currency && <span className="mr-1.5 align-top font-sans text-xl font-semibold text-muted-foreground">₱</span>}{value}</div>
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tile}`}><Icon className="size-5" aria-hidden /></span>
      </div>
      <div className="mt-4 border-t pt-3 text-[0.8125rem] text-muted-foreground">{note}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, right, children, className = "" }: { title: string; icon?: React.ElementType; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-card ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-2xl font-extrabold uppercase leading-none tracking-wide">
          {Icon && <Icon className="size-5 text-brand" aria-hidden />}{title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Scanner status panel: real numbers straight from the bridge (nothing simulated). */
function ScannerPanel() {
  const state = useBridgeStatus();
  const info = useBridgeInfo();
  const online = state === "ok";
  const label = { loading: "CHECKING", ok: "ONLINE", scanner_off: "UNPLUGGED", reconnecting: "RECONNECTING", sync_error: "NO FINGERPRINTS", bridge_off: "OFFLINE" }[state];
  return (
    <Panel title="Scanner status" icon={Fingerprint}>
      <div className="rounded-xl bg-accent p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-semibold"><span className={`size-2.5 rounded-full ${online ? "bg-ok" : state === "loading" ? "bg-muted-foreground" : "bg-bad animate-pulse"}`} />ZKTeco Live20R</div>
          <span className={`font-display text-sm font-extrabold tracking-wider ${online ? "text-ok" : "text-bad"}`}>{label}</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
          <div><dt className="eyebrow !text-[0.8125rem]">Fingerprints</dt><dd className="mt-1 font-semibold">{info ? info.templatesLoaded : "…"} loaded</dd></div>
          <div><dt className="eyebrow !text-[0.8125rem]">Last scan</dt><dd className="mt-1 font-semibold">{clock(info?.lastScanAt)}</dd></div>
          <div className="col-span-2"><dt className="eyebrow !text-[0.8125rem]">Last sync with the website</dt>
            <dd className="mt-1 font-semibold">{clock(info?.lastSyncAt)} {info?.lastSyncOk === false && <span className="font-normal text-bad">(failed)</span>}</dd></div>
        </dl>
      </div>
    </Panel>
  );
}

export function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const header = (
    <PageHeader eyebrow="Command center" title="Dashboard" description="Live numbers for the gym floor. Refreshes every 30 seconds.">
      {d && <span className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-[0.8125rem] font-semibold shadow-card"><span className="size-2 rounded-full bg-ok" />Floor active: {d.checkinsToday} checked in today</span>}
      <button onClick={load} disabled={busy} className={buttonVariants({ variant: "outline", className: "rounded-full bg-card" })}><RefreshCw className={busy ? "animate-spin" : ""} /> Refresh data</button>
      <Link href="/admin/register?mode=walkin" className={buttonVariants({ className: "rounded-full" })}><UserPlus /> Quick walk-in</Link>
    </PageHeader>
  );

  if (!d) {
    return (
      <div>
        {header}
        <div className="space-y-4"><Skeleton className="h-52 w-full" /><Skeleton className="h-72 w-full" />{error && <p className="text-sm text-warn">{error}</p>}</div>
      </div>
    );
  }

  const chartData = d.peakHours.map((h) => ({ label: hourLabel(h.hour), count: h.count }));
  const peak = d.peakHours.reduce((a, b) => (b.count > a.count ? b : a));
  const incomeDelta = d.incomeToday - d.incomeYesterday;

  return (
    <div className="min-w-0">
      {header}
      <div className="space-y-6">
        <BridgeBanner />
        {error && <p className="text-sm text-warn">{error}</p>}

        <section aria-label="Today" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Check-ins today" value={d.checkinsToday} tone="text-brand" icon={Fingerprint} tile="bg-accent text-brand"
            note={<span className="flex items-center justify-between"><span className="flex items-center gap-1.5 font-semibold text-ok"><span className="size-1.5 rounded-full bg-ok" />live</span><span>Busiest hour today: <b className="text-foreground">{d.peakHourToday ?? "none yet"}</b></span></span>} />
          <Kpi label="Walk-ins today" value={d.walkinsToday} icon={DoorOpen} tile="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
            note="Day passes logged at the desk today" />
          <Kpi label="Income today" value={peso(d.incomeToday)} currency icon={Banknote} tile="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            note={<span className={`flex items-center gap-1.5 font-semibold ${incomeDelta >= 0 ? "text-ok" : "text-bad"}`}>{incomeDelta >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{incomeDelta >= 0 ? "+" : "-"}₱{peso(Math.abs(incomeDelta))}<span className="font-normal text-muted-foreground">vs yesterday</span></span>} />
          <Kpi label="Income this month" value={peso(d.incomeMonth)} currency icon={Banknote} tile="bg-accent text-brand"
            note={`Since ${new Date(d.today.slice(0, 8) + "01T00:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric" })}`} />
        </section>

        <section aria-label="Members" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-card">
            <div><div className="eyebrow">Active members</div><div className="numeral mt-3 text-5xl text-ok">{d.members.active}</div></div>
            <div className="flex flex-col items-end gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><UsersRound className="size-5" /></span>
              <Badge variant="outline" className="border-ok/40 text-ok">{d.members.active > 0 ? "Healthy" : "No members"}</Badge></div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-card">
            <div><div className="eyebrow">Expiring (3 days)</div><div className="numeral mt-3 text-5xl text-warn">{d.members.expiring}</div></div>
            <div className="flex flex-col items-end gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><BellRing className="size-5" /></span>
              <Badge variant="outline" className={d.members.expiring ? "border-warn/40 text-warn" : "text-muted-foreground"}>{d.members.expiring ? "Follow up" : "None"}</Badge></div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-card">
            <div><div className="eyebrow">Expired</div><div className="numeral mt-3 text-5xl text-bad">{d.members.expired}</div></div>
            <div className="flex flex-col items-end gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"><CalendarX2 className="size-5" /></span>
              <Badge variant="outline" className={d.members.expired ? "border-bad/40 text-bad" : "border-ok/40 text-ok"}>{d.members.expired ? "Review" : "Clear"}</Badge></div>
          </div>
          <Link href="/admin/members" className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-brand/50">
            <div><div className="eyebrow">Members</div><div className="mt-3 text-base font-semibold">Open the members directory</div></div>
            <span className="flex size-11 items-center justify-center rounded-full bg-accent text-brand transition-transform group-hover:translate-x-1"><ArrowRight className="size-5" /></span>
          </Link>
        </section>

        <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
          <Panel title="Peak hours · last 30 days" className="xl:col-span-2"
            right={peak.count > 0 && <span className="rounded-lg bg-primary px-3 py-1.5 text-[0.8125rem] font-bold text-primary-foreground">Busiest: {hourFull(peak.hour)}</span>}>
            <div className="rounded-xl bg-accent/50 p-4">
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fontSize: 13 }} />
                  <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" radius={4}>
                    {chartData.map((c, i) => <Cell key={i} fill={c.count > 0 && c.count === peak.count ? "var(--chart-1)" : "var(--chart-3)"} />)}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {peak.count === 0 && <p className="mt-2 text-sm text-muted-foreground">No check-ins recorded yet.</p>}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="size-4 text-brand" />
              {d.avgWorkoutSessions > 0
                ? <>Average workout: <b className="text-foreground">{d.avgWorkoutMinutes} mins</b> across {d.avgWorkoutSessions} finished session{d.avgWorkoutSessions === 1 ? "" : "s"}</>
                : "Average workout time appears once members check out."}
            </p>
          </Panel>

          <div className="space-y-6">
            <ScannerPanel />
            <Panel title="Needs attention" icon={BellRing}>
              {d.attention.length === 0 ? (
                <div className="rounded-xl border border-dashed p-5 text-center">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><ShieldCheck className="size-5" /></span>
                  <div className="mt-3 font-semibold">Everyone is in good standing</div>
                  <p className="mt-1 text-sm text-muted-foreground">Nobody is expiring in the next 3 days.</p>
                </div>
              ) : (
                <ul className="divide-y text-sm">
                  {d.attention.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-3">
                      <span className="truncate font-semibold">{m.name}</span>
                      <Badge variant="outline" className={m.status === "expired" ? "border-bad/50 text-bad" : "border-warn/50 text-warn"}>{m.status === "expired" ? "Expired" : "Expires"} {m.expiryDate.slice(5)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/members" className={buttonVariants({ variant: "outline", className: "mt-4 w-full bg-accent/60" })}>Open members to renew <ArrowRight /></Link>
            </Panel>
          </div>
        </div>

        <Panel title="Recent attendance log" icon={CheckCircle2}
          right={<Link href="/admin/attendance" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">View full history <ArrowRight className="size-3.5" /></Link>}>
          {d.recent.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No check-ins yet. They appear here as members scan in.</p> : (
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Check in</TableHead><TableHead>Check out</TableHead><TableHead>Session</TableHead><TableHead>Verified by</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.recent.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-brand">{initials(a.name)}</span>
                          <div><div className="font-semibold">{a.name}</div><div className="text-[0.8125rem] text-muted-foreground">@{a.username}</div></div>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{a.checkIn}</TableCell>
                      <TableCell className="tabular-nums">{a.checkOut ?? <span className="text-muted-foreground">still in</span>}</TableCell>
                      <TableCell>{a.minutes !== null ? <Badge variant="secondary" className="bg-accent text-brand">{a.minutes} mins</Badge> : <Badge variant="outline" className="border-ok/40 text-ok">In the gym</Badge>}</TableCell>
                      <TableCell><Badge variant="outline" className="border-ok/40 text-ok"><Fingerprint className="size-3.5" /> Fingerprint</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
