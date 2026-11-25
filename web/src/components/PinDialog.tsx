"use client";
import { useState } from "react";
import { unlockFigures } from "@/lib/pin-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PinField } from "./PinField";

/** Form that unlocks private figures; used inside a dialog and inside the page gate. */
export function UnlockForm({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const problem = await unlockFigures(pin);
    setBusy(false);
    if (problem) { setError(problem); setPin(""); return; }
    setPin("");
    onUnlocked();
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <PinField id="unlock-pin" value={pin} onChange={setPin} autoFocus />
      {error && <p role="alert" className="text-sm font-medium text-bad">{error}</p>}
      <Button type="submit" disabled={busy || pin.length !== 4}>{busy ? "Checking…" : "Show"}</Button>
    </form>
  );
}

export function PinDialog({ open, onOpenChange, onUnlocked, what }: { open: boolean; onOpenChange: (o: boolean) => void; onUnlocked: () => void; what: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter your PIN</DialogTitle>
          <DialogDescription>{what}</DialogDescription>
        </DialogHeader>
        <UnlockForm onUnlocked={() => { onOpenChange(false); onUnlocked(); }} />
      </DialogContent>
    </Dialog>
  );
}
