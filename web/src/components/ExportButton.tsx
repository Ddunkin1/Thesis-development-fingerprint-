"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PinDialog } from "./PinDialog";

/** A CSV download that asks for the PIN first, unless it was typed in the last few minutes. */
export function ExportButton({ href, className }: { href: string; className?: string }) {
  const [ask, setAsk] = useState(false);
  const download = () => { const a = document.createElement("a"); a.href = href; a.download = ""; document.body.appendChild(a); a.click(); a.remove(); };
  async function start() {
    const res = await fetch("/api/admin/pin").catch(() => null);
    const data = res?.ok ? await res.json() : null;
    if (data?.unlockedUntil && data.unlockedUntil * 1000 > Date.now() + 5000) download();
    else setAsk(true);
  }
  return (
    <>
      <Button variant="outline" className={className} onClick={start}>Export CSV</Button>
      <PinDialog open={ask} onOpenChange={setAsk} onUnlocked={download} what="Exports contain members' personal information." />
    </>
  );
}
