"use client";
import { BarChart3, CalendarDays, LayoutDashboard, Menu, MonitorPlay, Trophy, UserPlus, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { LogoutButton } from "./LogoutButton";
import { ScannerStatus } from "./ScannerStatus";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Add an entry here when a new admin page is built.
const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/register", label: "Register", icon: UserPlus },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Main">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[0.9375rem] font-medium transition-colors
              ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}>
            {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded bg-brand" />}
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
      <Link href="/kiosk" onClick={onNavigate}
        className="mt-3 flex items-center gap-3 rounded-md border border-brand/50 px-3 py-2 text-[0.9375rem] font-semibold text-brand transition-colors hover:bg-brand hover:text-white">
        <MonitorPlay className="size-4" /> Open kiosk
      </Link>
    </nav>
  );
}

/** Admin frame: fixed sidebar on desktop, slide-in menu on phones. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <Brand size="sm" />
        <NavList />
        <ScannerStatus />
        <ThemeToggle className="self-start" />
        <LogoutButton className="justify-start text-muted-foreground" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Brand size="sm" />
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}><Menu /></SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col gap-6 bg-sidebar p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand size="sm" />
              <NavList />
              <ScannerStatus />
              <ThemeToggle className="self-start" />
              <LogoutButton className="justify-start text-muted-foreground" />
            </SheetContent>
          </Sheet>
        </header>
        <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
