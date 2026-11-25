"use client";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Four numbers, shown as dots. */
export function PinField({ value, onChange, autoFocus = false, id = "pin" }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; id?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Your 4-digit PIN</Label>
      <div className="flex flex-wrap items-center gap-3">
        <Input id={id} type="password" inputMode="numeric" autoComplete="off" maxLength={4} autoFocus={autoFocus}
          className="h-11 w-36 text-center text-lg tracking-[0.4em]" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        <Link href="/admin/pin" className="text-sm font-medium text-brand hover:underline">No PIN yet, or forgot it?</Link>
      </div>
    </div>
  );
}
