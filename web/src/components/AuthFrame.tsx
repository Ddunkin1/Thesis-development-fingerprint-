import { Flame } from "lucide-react";
import { Brand, BrandMark } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { WeekTiles } from "./WeekTiles";
import type { Tile } from "@/lib/streak-rules";

// A sample week that shows the streak colours: this is the product's visual identity, not real data.
const SAMPLE: Tile[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
  date: label, label, attended: true, frozen: false, streak: i + 1,
  level: ([1, 2, 2, 3, 3, 4, 4] as const)[i], isToday: false, future: false,
}));

/**
 * Split screen used by sign-in and "new password": a dark branded panel on the left (always dark, in both themes),
 * the form on the right. The theme switch sits in the top right corner.
 */
export function AuthFrame({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1020] p-12 text-white lg:flex">
        {/* soft indigo light, gym-floor feeling without needing a photo */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(99,102,241,0.38),transparent),radial-gradient(50%_45%_at_90%_95%,rgba(168,85,247,0.22),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:56px_56px]" />

        <div className="relative flex items-center gap-3 self-start rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <BrandMark className="size-10" />
          <div>
            <div className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.1em]">Chaq Gym</div>
            <div className="mt-1 font-display text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-indigo-200">Attendance portal</div>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-7xl font-extrabold uppercase leading-[0.92] tracking-wide xl:text-8xl">
            Show up.<br />Scan in.<br /><span className="text-indigo-300">Keep the streak.</span>
          </h2>
          <div className="mt-10 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between font-display text-sm font-bold uppercase tracking-[0.12em]">
              <span className="flex items-center gap-2"><Flame className="size-4 text-orange-300" /> Example week</span>
              <span className="text-indigo-200">Every visit counts</span>
            </div>
            <WeekTiles week={SAMPLE} />
          </div>
        </div>

        <p className="relative text-sm text-indigo-100/70">Fingerprint attendance and membership for Chaq Gym.</p>
      </section>

      <section className="relative flex items-center justify-center bg-background p-6">
        <ThemeToggle compact className="absolute right-5 top-5" />
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><BrandMark className="size-11" /><Brand size="lg" /></div>
          {eyebrow && <span className="mb-4 inline-block rounded-lg bg-accent px-3 py-1.5 font-display text-sm font-bold uppercase tracking-[0.1em] text-brand">{eyebrow}</span>}
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none">{title}</h1>
          <p className="mb-8 mt-3 text-base text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
