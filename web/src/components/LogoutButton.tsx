"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Ends the session. `iconOnly` is the small door icon used in the sidebar user card. */
export function LogoutButton({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return iconOnly ? (
    <Button variant="ghost" size="icon-sm" className={className} onClick={logout} aria-label="Sign out" title="Sign out"><LogOut /></Button>
  ) : (
    <Button variant="ghost" size="sm" className={className} onClick={logout}><LogOut /> Sign out</Button>
  );
}
