"use client";
import { useCallback, useEffect, useState } from "react";
import { lockFigures } from "@/lib/pin-client";
import { Button } from "@/components/ui/button";
import { UnlockForm } from "./PinDialog";
import { TableSkeleton } from "./skeletons";

/** Shows a private page only after the PIN. It hides itself again when the 5 minutes are over. */
export function PinGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");

  const check = useCallback(async () => {
    const res = await fetch("/api/admin/pin").catch(() => null);
    const data = res?.ok ? await res.json() : null;
    setState(data?.unlockedUntil && data.unlockedUntil * 1000 > Date.now() ? "open" : "locked");
  }, []);

  useEffect(() => {
    const first = setTimeout(check, 0);
    const t = setInterval(check, 20_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [check]);

  if (state === "checking") return <TableSkeleton />;
  if (state === "locked") {
    return (
      <div className="max-w-md rounded-lg border bg-card p-6">
        <p className="mb-4 text-muted-foreground">This page has private figures. It stays open for 5 minutes.</p>
        <UnlockForm onUnlocked={check} />
      </div>
    );
  }
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={async () => { await lockFigures(); setState("locked"); }}>Hide now</Button>
      </div>
      {children}
    </div>
  );
}
