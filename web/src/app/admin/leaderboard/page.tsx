import { Leaderboard } from "@/components/Leaderboard";
import { PageHeader } from "@/components/PageHeader";

export default function LeaderboardPage() {
  return (
    <main>
      <PageHeader eyebrow="Monthly ranking" title="Leaderboard" description="Top streaks of the month." />
      <Leaderboard />
    </main>
  );
}
