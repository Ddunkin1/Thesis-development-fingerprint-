"use client";
import { Flame, Trophy, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/member", label: "Home", icon: Flame },
  { href: "/member/board", label: "Board", icon: Trophy },
  { href: "/member/me", label: "Me", icon: UserRound },
];

/** Bottom tab bar, the way phone apps do it: thumb-reach, big targets, respects the iPhone home-bar safe area. */
export function MemberNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/member" ? path === "/member" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors ${active ? "text-brand" : "text-muted-foreground"}`}>
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-brand" />}
              <Icon className="size-6" />
              <span className="font-display text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
