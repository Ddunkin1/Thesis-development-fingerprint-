import { Award, CalendarCheck, Crown, Flame, Medal, Moon, Shield, Sparkles, Sunrise, Trophy, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  first_visit: Sparkles,
  seven_day_fire: Flame,
  thirty_day_fire: Medal,
  thirty_visits: Trophy,
  hundred_visits: Crown,
  perfect_week: CalendarCheck,
  weekend_warrior: Shield,
  early_bird: Sunrise,
  night_owl: Moon,
  comeback: Zap,
};

/** Line icon for a badge (replaces emoji so every badge looks like part of one set). */
export function BadgeIcon({ badgeKey, className }: { badgeKey: string; className?: string }) {
  const Icon = ICONS[badgeKey] ?? Award;
  return <Icon className={className} aria-hidden />;
}
