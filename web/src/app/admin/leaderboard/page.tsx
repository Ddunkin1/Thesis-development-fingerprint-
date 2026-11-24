import { Leaderboard } from "@/components/Leaderboard";
import { PageHeader } from "@/components/PageHeader";

export default function LeaderboardPage() {
  return (
    <main>
      <PageHeader title="Leaderboard" description="Best streaks this month." />
      <Leaderboard />
    </main>
  );
}
