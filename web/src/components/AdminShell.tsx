"use client";
import { BarChart3, CalendarClock, LayoutDashboard, Menu, ScanLine, Trophy, UserPlus, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand, BrandMark } from "./Brand";
import { LogoutButton } from "./LogoutButton";
import { ScannerStatus } from "./ScannerStatus";
import { ThemeToggle } from "./ThemeToggle";
import { TopBar, initials } from "./admin/TopBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useApi } from "@/lib/use-api";

// Add an entry here when a new admin page is built.
const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/register", label: "Register Member", icon: UserPlus },
  { href: "/admin/members", label: "Members Directory", icon: Users },
  { href: "/admin/attendance", label: "Attendance Log", icon: CalendarClock },
  { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
];

/** Sidebar content (shared by the desktop sidebar and the phone slide-in menu). */
function SidebarBody({ name, onNavigate }: { name: string; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <BrandMark />
        <div className="min-w-0">
          <Brand size="sm" />
          <div className="mt-1 truncate text-[0.75rem] text-muted-foreground">Attendance system</div>
        </div>
      </div>

      <Link href="/kiosk" onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-full border border-brand/40 bg-card px-4 py-2.5 text-[0.9375rem] font-semibold text-brand shadow-card transition-colors hover:bg-brand-strong hover:text-white">
        <ScanLine className="size-4" /> Open Kiosk Mode
      </Link>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[0.9375rem] font-semibold transition-colors
                ${active ? "bg-primary text-primary-foreground shadow-card" : "text-foreground/80 hover:bg-card hover:text-foreground"}`}>
              <Icon className="size-[1.15rem]" /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <ScannerStatus />
        <ThemeToggle block />
        <div className="flex items-center gap-3 rounded-xl px-1 pt-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials(name)}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name || "Admin"}</div>
            <div className="text-[0.75rem] text-muted-foreground">Administrator</div>
          </div>
          <LogoutButton iconOnly />
        </div>
      </div>
    </>
  );
}

/** Admin frame: fixed 240px sidebar + top bar on desktop, slide-in menu on phones. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: me } = useApi<{ name: string; role: string }>("/api/auth/me");
  const name = me?.name ?? "";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 border-r bg-sidebar p-4 md:flex">
        <SidebarBody name={name} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={name} />
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5"><BrandMark className="size-9" /><Brand size="sm" /></div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}><Menu /></SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-5 bg-sidebar p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SidebarBody name={name} />
            </SheetContent>
          </Sheet>
        </header>
        <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
