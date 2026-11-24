import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

// Phase 2 placeholder: member pages (streak tiles, badges, leaderboard) are added later.
export default function MemberHome() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <Brand size="lg" />
      <h1 className="font-display text-5xl font-bold uppercase">Member area</h1>
      <p className="eyebrow">Coming soon</p>
      <p className="max-w-sm text-sm text-muted-foreground">Your streak, badges and the monthly leaderboard will appear here.</p>
      <ThemeToggle />
      <LogoutButton />
    </main>
  );
}
