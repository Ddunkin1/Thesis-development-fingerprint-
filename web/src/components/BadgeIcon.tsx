import { Flame, Sparkles, Trophy, Zap, Award, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  first_visit: Sparkles,
  seven_day_fire: Flame,
  thirty_visits: Trophy,
  comeback: Zap,
};

/** Line icon for a badge (replaces emoji so every badge looks like part of one set). */
export function BadgeIcon({ badgeKey, className }: { badgeKey: string; className?: string }) {
  const Icon = ICONS[badgeKey] ?? Award;
  return <Icon className={className} aria-hidden />;
}
