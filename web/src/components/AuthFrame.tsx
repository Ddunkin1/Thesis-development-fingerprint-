import { Brand } from "./Brand";
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
      <section className="relative hidden flex-col justify-between bg-[#26201a] p-12 text-[#f6f1e9] lg:flex">
        <div className="flex items-center gap-3 self-start">
          <div className="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.1em]">Chaq Gym</div>
        </div>

        <div>
          <h2 className="font-display text-7xl font-extrabold uppercase leading-[0.92] tracking-wide xl:text-8xl">
            Show up.<br />Scan in.<br /><span className="text-[#ff8a33]">Keep the streak.</span>
          </h2>
          <div className="mt-10 max-w-xl rounded-lg border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between text-sm font-semibold">
              <span>Example week</span>
              <span className="text-[#b9afa0]">Every visit counts</span>
            </div>
            <WeekTiles week={SAMPLE} />
          </div>
        </div>

        <p className="text-sm text-[#b9afa0]">Fingerprint attendance and membership for Chaq Gym.</p>
      </section>

      <section className="relative flex items-center justify-center bg-background p-6">
        <ThemeToggle compact className="absolute right-5 top-5" />
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Brand size="lg" /></div>
          {eyebrow && <span className="mb-4 inline-block rounded-md bg-accent px-3 py-1 text-sm font-semibold text-brand">{eyebrow}</span>}
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none">{title}</h1>
          <p className="mb-8 mt-3 text-base text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
