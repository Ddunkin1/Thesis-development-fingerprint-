import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { WeekTiles } from "./WeekTiles";
import type { Tile } from "@/lib/streak-rules";

// A sample week that shows the streak colours: this is the product's visual identity, not real data.
const SAMPLE: Tile[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
  date: label, label, attended: true, frozen: false, streak: i + 1,
  level: ([1, 2, 2, 3, 3, 4, 4] as const)[i], isToday: false, future: false,
}));

/** Split screen used by login and "change password": brand panel on the left, the form on the right. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r bg-sidebar p-12 lg:flex">
        <Brand size="lg" />
        <div>
          <h2 className="font-display text-7xl font-extrabold uppercase leading-[0.9]">
            Show up.<br />Scan in.<br /><span className="text-brand">Keep the streak.</span>
          </h2>
          <div className="mt-10 max-w-md"><WeekTiles week={SAMPLE} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Fingerprint attendance for Chaq Gym</p>
      </section>

      <section className="relative flex items-center justify-center p-6">
        <ThemeToggle compact className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Brand size="lg" /></div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none">{title}</h1>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
