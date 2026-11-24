"use client";
import { Flame, KeyRound, MoreHorizontal, Pencil, RefreshCw, Search, Trash2, Fingerprint } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { StreakView } from "@/services/streak-service";
import { bridge } from "@/lib/bridge-client";
import { useMembershipPrice } from "@/lib/use-membership-price";
import { BadgeIcon } from "./BadgeIcon";
import { BridgeBanner } from "./BridgeBanner";
import { ConsistencyGrid } from "./ConsistencyGrid";
import { FingerEnroll } from "./FingerEnroll";
import { WeekTiles } from "./WeekTiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Member {
  id: number; fullName: string; username: string; expiryDate: string | null; daysLeft: number | null;
  status: "active" | "expiring" | "expired" | "none"; fingers: number; streak: number; paid: number;
}
type Dialogs =
  | { kind: "renew" | "edit" | "reenroll" | "reset" | "delete" | "streak"; m: Member }
  | { kind: "info"; title: string; text: string }
  | null;

const STATUS: Record<Member["status"], { label: string; cls: string }> = {
  active: { label: "Active", cls: "border-ok/50 text-ok" },
  expiring: { label: "Expiring soon", cls: "border-warn/50 text-warn" },
  expired: { label: "Expired", cls: "border-bad/50 text-bad" },
  none: { label: "No plan", cls: "text-muted-foreground" },
};

export function MembersTable() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Member[] | null>(null);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [value, setValue] = useState("");       // text/amount field inside dialogs
  const [template, setTemplate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [streakView, setStreakView] = useState<StreakView | null>(null);
  const price = useMembershipPrice();
  const [refundOn, setRefundOn] = useState(false); // delete dialog: member backed out and got their money back

  const load = useCallback(async (search: string) => {
    const res = await fetch(`/api/admin/members?q=${encodeURIComponent(search)}`);
    if (res.ok) setRows((await res.json()).members);
  }, []);

  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q, load]);

  function open(d: Dialogs, initial = "") {
    setDialog(d); setValue(initial); setTemplate(null); setError(""); setRefundOn(false);
    if (d?.kind === "streak") {
      setStreakView(null);
      fetch(`/api/admin/members/${d.m.id}/streak`).then((r) => r.json()).then(setStreakView);
    }
  }
  function close() { bridge.cancel(); setDialog(null); }

  /** Sends a request, refreshes the list, and (for fingerprint changes) tells the bridge to re-download templates. */
  async function act(url: string, method: string, body?: unknown, after?: (data: Record<string, string>) => void, resync = false) {
    setBusy(true); setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    if (resync) bridge.sync();
    await load(q);
    if (after) after(data); else setDialog(null);
  }

  const m = dialog && dialog.kind !== "info" ? dialog.m : null;

  return (
    <div>
      <BridgeBanner className="mb-4" />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-10 pl-9" placeholder="Search name or username..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Expires</TableHead>
              <TableHead className="hidden text-right md:table-cell">Streak</TableHead><TableHead className="hidden text-right md:table-cell">Prints</TableHead><TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null && Array.from({ length: 3 }, (_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
            {rows?.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No members found.</TableCell></TableRow>}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.fullName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.username}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className={STATUS[r.status].cls}>{STATUS[r.status].label}</Badge></TableCell>
                <TableCell className="hidden tabular-nums sm:table-cell">
                  {r.expiryDate ?? "-"}
                  {r.daysLeft !== null && r.daysLeft >= 0 && <div className="text-xs text-muted-foreground">{r.daysLeft} day(s) left</div>}
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  {r.streak > 0 ? <span className="numeral inline-flex items-center gap-1 text-xl text-brand"><Flame className="size-4" />{r.streak}</span> : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">{r.fingers}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" onClick={() => open({ kind: "renew", m: r })}><RefreshCw /> Renew</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.fullName}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => open({ kind: "streak", m: r })}><Flame /> View streak</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "edit", m: r }, r.fullName)}><Pencil /> Edit name</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "reenroll", m: r })}><Fingerprint /> Re-enroll fingerprint</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "reset", m: r })}><KeyRound /> Reset password</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => open({ kind: "delete", m: r }, String(r.paid))}><Trash2 /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent>
          {dialog?.kind === "renew" && m && (
            <>
              <DialogHeader>
                <DialogTitle>Renew {m.fullName}</DialogTitle>
                <DialogDescription>{m.status === "expired" ? "Expired: the new expiry will be today + 30 days." : "Not expired yet: 30 days are added to the current expiry."}</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
                <div className="eyebrow">Membership fee · 30 days</div>
                <div className="numeral text-4xl"><span className="mr-1.5 align-top font-sans text-lg font-medium text-muted-foreground">₱</span>{price ?? "…"}</div>
              </div>
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy || price === null} onClick={() => act(`/api/admin/members/${m.id}/renew`, "POST", undefined,
                  (d) => { setDialog(null); toast.success(`Renewed - new expiry ${d.expiryDate}`); })}>
                  {busy ? "Saving..." : price !== null ? `Collect ₱${price} and renew` : "Renew membership"}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "edit" && m && (
            <>
              <DialogHeader><DialogTitle>Edit name</DialogTitle><DialogDescription>The username stays <span className="font-mono">{m.username}</span>.</DialogDescription></DialogHeader>
              <Input className="h-10" value={value} onChange={(e) => setValue(e.target.value)} maxLength={100} autoFocus />
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter><Button disabled={busy || value.trim().length < 2} onClick={() => act(`/api/admin/members/${m.id}`, "PATCH", { fullName: value }, () => { setDialog(null); toast.success("Name updated"); })}>Save</Button></DialogFooter>
            </>
          )}

          {dialog?.kind === "reenroll" && m && (
            <>
              <DialogHeader><DialogTitle>Re-enroll {m.fullName}</DialogTitle><DialogDescription>Replaces the primary fingerprint. The new scan is only saved when you press Save.</DialogDescription></DialogHeader>
              <FingerEnroll label="Primary finger" template={template} onTemplate={setTemplate} userId={m.id} />
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy || !template} onClick={() => act(`/api/admin/members/${m.id}/fingerprint`, "PUT", { fingerIndex: 0, template },
                  () => { setDialog(null); toast.success("Fingerprint updated - the scanner uses it right away"); }, true)}>Save fingerprint</Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "reset" && m && (
            <>
              <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>Reset <b>{m.fullName}</b> to the default password? They will have to choose a new one at next login.</DialogDescription></DialogHeader>
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy} onClick={() => act(`/api/admin/members/${m.id}/reset-password`, "POST", undefined,
                  (d) => setDialog({ kind: "info", title: "Password reset", text: `Username: ${d.username}\nDefault password: ${d.password}` }))}>Reset to default</Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "delete" && m && (
            <>
              <DialogHeader>
                <DialogTitle>Delete member</DialogTitle>
                <DialogDescription>Permanently delete <b>{m.fullName}</b>, including their fingerprint, attendance and streak. This cannot be undone.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-md border p-3">
                <div className="text-sm">Total paid by this member: <b className="tabular-nums">₱{m.paid.toLocaleString("en-PH")}</b></div>
                {m.paid > 0 && (
                  <>
                    <div className="flex items-start gap-3">
                      <Checkbox id="refund" checked={refundOn} onCheckedChange={(v) => setRefundOn(v === true)} className="mt-0.5" />
                      <Label htmlFor="refund" className="block text-sm font-normal leading-relaxed">
                        <b className="font-semibold">The member backed out and I returned their money.</b> This records a refund, so income goes down by that amount.
                      </Label>
                    </div>
                    {refundOn && (
                      <div className="space-y-1.5">
                        <Label htmlFor="refundAmount" className="text-xs text-muted-foreground">Amount returned (₱)</Label>
                        <Input id="refundAmount" className="h-10" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  {refundOn ? "The original payments stay in the records (with the member's name) and a negative refund entry is added." : "Without a refund, their payments stay counted as sales."}
                </p>
              </div>
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button variant="destructive" disabled={busy || (refundOn && !(Number(value) > 0 && Number(value) <= m.paid))}
                  onClick={() => act(`/api/admin/members/${m.id}`, "DELETE", { refund: refundOn ? Number(value) : 0 }, () => { setDialog(null); toast.success(refundOn ? `Member deleted, ₱${value} refund recorded` : "Member deleted"); }, true)}>
                  {refundOn ? "Delete and record refund" : "Delete permanently"}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "streak" && m && (
            <>
              <DialogHeader><DialogTitle>{m.fullName}</DialogTitle><DialogDescription>Streak, this week and history</DialogDescription></DialogHeader>
              {!streakView ? <Skeleton className="h-40 w-full" /> : (
                <div className="space-y-5">
                  <div className="flex items-end gap-6">
                    <div><div className="eyebrow">Current streak</div><div className="numeral flex items-center gap-2 text-6xl text-brand"><Flame className="size-9" />{streakView.current}</div></div>
                    <div><div className="eyebrow">Best</div><div className="numeral text-4xl">{streakView.longest}</div></div>
                  </div>
                  <WeekTiles week={streakView.week} />
                  <ConsistencyGrid days={streakView.history} />
                  <div>
                    <div className="eyebrow mb-2">Badges</div>
                    {streakView.badges.length === 0 ? <p className="text-sm text-muted-foreground">No badges yet.</p> : (
                      <ul className="space-y-1.5 text-sm">
                        {streakView.badges.map((b) => <li key={b.key} className="flex items-center gap-2"><BadgeIcon badgeKey={b.key} className="size-4 text-brand" /><b>{b.label}</b><span className="text-muted-foreground">{b.description}</span></li>)}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {dialog?.kind === "info" && (
            <>
              <DialogHeader><DialogTitle>{dialog.title}</DialogTitle></DialogHeader>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">{dialog.text}</pre>
              <DialogFooter><Button onClick={() => setDialog(null)}>OK</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
