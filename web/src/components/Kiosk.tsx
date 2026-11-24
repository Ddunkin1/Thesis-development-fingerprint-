"use client";
import { ArrowLeft, Ban, Check, Flame, Fingerprint, Maximize, Loader2, PlugZap, ShieldAlert, Unplug, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bridge } from "@/lib/bridge-client";
import { PROBLEM_TEXT, useBridgeStatus } from "@/lib/use-bridge-status";
import { MILESTONES, type BadgeDef } from "@/lib/badges";
import type { StreakView } from "@/services/streak-service";
import { BadgeIcon } from "./BadgeIcon";
import { BridgeBanner } from "./BridgeBanner";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { WeekTiles } from "./WeekTiles";

type Outcome =
  | { status: "no_match" | "not_found" }
  | { status: "session_expired" | "server_error" }
  | { status: "expired"; name: string; expiryDate: string }
  | { status: "checked_in" | "checked_out" | "already"; name: string; time: string; daysLeft: number; expiringSoon: boolean; message?: string; streak: StreakView; newBadges: BadgeDef[] };

const SHOW_MS = 6500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fullscreen check-in screen, designed to be read from across the room:
 * a scoreboard clock while idle, then ONE huge result on a solid colour (purple = welcome, amber = already in,
 * red = expired / not recognised). No cards, no small print.
 */
export function Kiosk() {
  const [result, setResult] = useState<Outcome | null>(null);
  const [now, setNow] = useState<Date | null>(null); // set after mount (a prerendered clock would be stale)
  const alive = useRef(true);
  const bridgeState = useBridgeStatus();
  const offline = !result && (bridgeState === "scanner_off" || bridgeState === "bridge_off" || bridgeState === "reconnecting" || bridgeState === "sync_error");

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  useEffect(() => {
    alive.current = true;
    (async () => {
      while (alive.current) {
        const r = await bridge.identify();            // waits up to 10 s for a finger
        if (!alive.current) break;
        if (!r.ok) { await sleep(2000); continue; }   // bridge off / scanner unplugged: the banner explains, keep retrying
        if (r.status === "timeout") continue;
        const res = await fetch("/api/admin/kiosk/scan", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: r.status === "matched" ? r.userId : null }),
        }).catch(() => null);
        // The login cookie lasts 8 hours. If it ran out, say so (do NOT show "not recognized" for a valid finger).
        if (res && (res.status === 401 || res.status === 403)) { setResult({ status: "session_expired" }); return; } // stop scanning until signed in again
        setResult(res?.ok ? await res.json() : { status: "server_error" });
        await sleep(SHOW_MS);
        setResult(null);
      }
    })();
    return () => { alive.current = false; bridge.cancel(); };
  }, []);

  const bg = !result ? (offline ? (bridgeState === "reconnecting" ? "bg-[#3b2a06]" : "bg-[#3b0a0a]") : "bg-background")
    : result.status === "checked_in" ? "bg-[#4c1d95]"
    : result.status === "checked_out" ? "bg-[#17171b]"
    : result.status === "already" ? "bg-[#4a3203]"
    : result.status === "expired" ? "bg-[#7f1d1d]"
    : result.status === "session_expired" || result.status === "server_error" ? "bg-[#3b2a06]"
    : "bg-[#1c1c22]";

  const time = now ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true }).format(now) : "";
  const date = now ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" }).format(now) : "";

  return (
    <main className={`relative flex min-h-screen flex-col ${bg} ${result || offline ? "text-white" : ""} p-6 transition-colors duration-300 md:p-10`}>
      <div className={`flex items-center justify-between ${result || offline ? "text-white/60 [&_a:hover]:text-white [&_button:hover]:text-white" : "text-muted-foreground [&_a:hover]:text-foreground [&_button:hover]:text-foreground"}`}>
        <Link href="/admin" className="flex items-center gap-2 text-sm"><ArrowLeft className="size-4" /> Admin</Link>
        <div className="flex items-center gap-2">
          {!result && !offline && <ThemeToggle compact />}
          <button aria-label="Toggle fullscreen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
            className="rounded-md p-2 hover:bg-foreground/10"><Maximize className="size-5" /></button>
        </div>
      </div>
      {!offline && <div className="mx-auto mt-2 w-full max-w-3xl"><BridgeBanner /></div>}

      <div className="flex flex-1 flex-col justify-center">
        {offline && (
          <div className="slide-up text-center" role="alert">
            {bridgeState === "reconnecting" ? <Loader2 className="mx-auto size-[16vw] animate-spin md:size-[9vw]" />
              : bridgeState === "scanner_off" ? <Unplug className="mx-auto size-[16vw] md:size-[9vw]" /> : <PlugZap className="mx-auto size-[16vw] md:size-[9vw]" />}
            <div className="font-display mt-4 text-[12vw] font-extrabold uppercase leading-[0.9] md:text-[7vw]">{PROBLEM_TEXT[bridgeState as "scanner_off" | "reconnecting" | "sync_error" | "bridge_off"].title}</div>
            <p className="mx-auto mt-6 max-w-4xl text-[5vw] leading-snug text-white/85 md:text-[2.2vw]">{PROBLEM_TEXT[bridgeState as "scanner_off" | "reconnecting" | "sync_error" | "bridge_off"].help}</p>
            <p className="mt-8 animate-pulse text-[4vw] text-white/70 md:text-[1.6vw]">{bridgeState === "reconnecting" ? "Almost ready. This screen returns by itself." : "Waiting for the scanner. This screen returns by itself when it is ready."}</p>
          </div>
        )}

        {!result && !offline && (
          <div className="slide-up text-center">
            <div className="eyebrow !text-base !text-muted-foreground">{date}</div>
            <div className="numeral text-[22vw] leading-none md:text-[17vw]">{time || " "}</div>
            <div className="mt-6 flex items-center justify-center gap-4 text-[5vw] font-medium text-muted-foreground md:text-[2.6vw]">
              <Fingerprint className="size-[1.3em] animate-pulse text-brand" /> Place your finger on the scanner
            </div>
            <div className="mt-16 flex justify-center opacity-70"><Brand size="sm" /></div>
          </div>
        )}

        {result && (result.status === "checked_in" || result.status === "checked_out") && <Welcome r={result} />}

        {result?.status === "already" && (
          <div className="slide-up">
            <Check className="size-[12vw] text-warn md:size-[7vw]" />
            <div className="eyebrow mt-4 !text-lg !text-warn">{result.message ?? "Already checked in today"} · {result.time}</div>
            <div className="font-display mt-2 text-[12vw] font-extrabold uppercase leading-[0.9] md:text-[8vw]">{result.name}</div>
            <div className="mt-8 max-w-3xl"><WeekTiles week={result.streak.week} big /></div>
          </div>
        )}

        {result?.status === "expired" && (
          <div className="slide-up">
            <Ban className="size-[12vw] md:size-[7vw]" />
            <div className="eyebrow mt-4 !text-lg !text-white/70">{result.name} · expired {result.expiryDate}</div>
            <div className="font-display mt-2 text-[13vw] font-extrabold uppercase leading-[0.9] md:text-[9vw]">Membership expired</div>
            <div className="mt-4 text-[5vw] text-white/80 md:text-[2.4vw]">Please renew at the front desk.</div>
          </div>
        )}

        {result?.status === "session_expired" && (
          <div className="slide-up">
            <ShieldAlert className="size-[12vw] text-warn md:size-[7vw]" />
            <div className="font-display mt-4 text-[12vw] font-extrabold uppercase leading-[0.9] md:text-[8vw]">Session expired</div>
            <div className="mt-4 text-[5vw] text-white/80 md:text-[2.4vw]">Please sign in again to keep checking members in.</div>
            <Link href="/login" className="mt-8 inline-block rounded-md bg-white px-8 py-4 text-[5vw] font-semibold text-black md:text-[1.8vw]">Sign in</Link>
          </div>
        )}

        {result?.status === "server_error" && (
          <div className="slide-up">
            <ShieldAlert className="size-[12vw] text-warn md:size-[7vw]" />
            <div className="font-display mt-4 text-[12vw] font-extrabold uppercase leading-[0.9] md:text-[8vw]">Please try again</div>
            <div className="mt-4 text-[5vw] text-white/80 md:text-[2.4vw]">The scan could not be recorded. Scan your finger once more.</div>
          </div>
        )}

        {(result?.status === "no_match" || result?.status === "not_found") && (
          <div className="slide-up">
            <XCircle className="size-[12vw] text-bad md:size-[7vw]" />
            <div className="font-display mt-4 text-[13vw] font-extrabold uppercase leading-[0.9] md:text-[9vw]">Not recognized</div>
            <div className="mt-4 text-[5vw] text-white/80 md:text-[2.4vw]">Fingerprint not recognized, try again.</div>
          </div>
        )}
      </div>
    </main>
  );
}

type Visit = Extract<Outcome, { streak: StreakView }>; // checked_in | checked_out | already

function Welcome({ r }: { r: Visit }) {
  const arriving = r.status === "checked_in";
  const { streak } = r;
  const milestone = arriving && MILESTONES.includes(streak.current);
  const freshStart = arriving && streak.current === 1 && streak.longest > 1;
  return (
    <div className="slide-up">
      <div className="eyebrow !text-lg !text-white/70">{arriving ? "Checked in" : "Checked out"} · {r.time}</div>
      <div className="font-display mt-1 text-[10vw] font-extrabold uppercase leading-[0.92] md:text-[6.2vw]">
        {arriving ? "Welcome," : "See you,"} {r.name}
      </div>

      {arriving && (
        <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex items-end gap-3">
            <Flame className={`size-[16vw] md:size-[9vw] ${streak.level >= 3 ? "flame text-orange-300" : "text-white/80"}`} />
            <span className="numeral pop-in text-[22vw] md:text-[13vw]">{streak.current}</span>
            <span className="eyebrow mb-[2vw] !text-xl !text-white/80">day streak</span>
          </div>
          {milestone && (
            <div className="pop-in mb-3 flex items-center gap-3 rounded-md bg-white px-5 py-3 text-[#4c1d95]">
              <span className="font-display text-[6vw] font-extrabold uppercase leading-none md:text-[2.6vw]">{streak.current}-day milestone!</span>
            </div>
          )}
        </div>
      )}
      {freshStart && <p className="mt-2 text-[4.5vw] text-white/80 md:text-[1.8vw]">Fresh start. Your best is {streak.longest} days. Every streak begins at day 1.</p>}

      {arriving && <div className="mt-6 max-w-4xl"><WeekTiles week={streak.week} big /></div>}

      {r.newBadges.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {r.newBadges.map((b) => (
            <div key={b.key} className="pop-in flex items-center gap-4 rounded-md border border-white/30 bg-white/10 px-5 py-3">
              <BadgeIcon badgeKey={b.key} className="size-[9vw] text-orange-300 md:size-[3.6vw]" />
              <div>
                <div className="eyebrow !text-white/70">New badge</div>
                <div className="font-display text-[7vw] font-extrabold uppercase leading-none md:text-[3vw]">{b.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {r.expiringSoon && <p className="mt-6 inline-block rounded-md bg-warn/20 px-4 py-2 text-[4.5vw] text-warn md:text-[1.8vw]">Membership expires in {r.daysLeft} day(s). Please renew soon.</p>}
    </div>
  );
}
