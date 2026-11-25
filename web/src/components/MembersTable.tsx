"use client";
import { ClipboardPen, Fingerprint, Flame, KeyRound, MoreHorizontal, Pencil, Search, ShieldOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { StreakView } from "@/services/streak-service";
import { bridge } from "@/lib/bridge-client";
import { CONSENT_TEXT } from "@/lib/consent";
import { PIN_HEADER } from "@/lib/pin-client";
import { ExportButton } from "./ExportButton";
import { PinField } from "./PinField";
import { useMembershipPrice } from "@/lib/use-membership-price";
import { BadgeIcon } from "./BadgeIcon";
import { BridgeBanner } from "./BridgeBanner";
import { ConsistencyGrid } from "./ConsistencyGrid";
import { FingerEnroll } from "./FingerEnroll";
import { WeekTiles } from "./WeekTiles";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "./PageHeader";
import { initials } from "./admin/TopBar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StripSkeleton } from "./skeletons";
import { peek, put } from "@/lib/client-cache";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Member {
  id: number; fullName: string; username: string; expiryDate: string | null; daysLeft: number | null;
  status: "active" | "expiring" | "expired" | "none"; fingers: number; streak: number; paid: number; joinedOn: string; consent: boolean;
}
type Dialogs =
  | { kind: "renew" | "edit" | "reenroll" | "reset" | "delete" | "streak" | "manual" | "withdraw"; m: Member }
  | { kind: "info"; title: string; text: string }
  | null;

const MANUAL_REASONS = ["Finger is wet", "Finger is injured", "Finger not readable", "Scanner problem"];

type Filter = "all" | "active" | "expiring" | "expired";
type Sort = "expiry" | "name" | "streak";

// status chips: flat soft fill with matching text
const STATUS: Record<Member["status"], { label: string; pill: string; dot: string }> = {
  active: { label: "Active", pill: "bg-ok-soft text-ok", dot: "bg-ok" },
  expiring: { label: "Expiring soon", pill: "bg-warn-soft text-warn", dot: "bg-warn" },
  expired: { label: "Expired", pill: "bg-bad-soft text-bad", dot: "bg-bad" },
  none: { label: "No plan", pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

/** The page reads ?q= (top-bar search) and ?status= (links on the dashboard) and restarts the screen when they change. */
export function MembersTable() {
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  const st = sp.get("status");
  const initialFilter: Filter = st === "active" || st === "expiring" || st === "expired" ? st : "all";
  return <MembersInner key={`${initialQ}|${initialFilter}`} initialQ={initialQ} initialFilter={initialFilter} />;
}

function MembersInner({ initialQ, initialFilter }: { initialQ: string; initialFilter: Filter }) {
  const [q, setQ] = useState(initialQ);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [sort, setSort] = useState<Sort>("expiry");
  const [rows, setRows] = useState<Member[] | null>(() => peek<Member[]>("admin:members"));
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [value, setValue] = useState("");       // text/amount field inside dialogs
  const [template, setTemplate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [streakView, setStreakView] = useState<StreakView | null>(null);
  const [pin, setPin] = useState(""); // asked for important actions; the server checks it
  const [consentAgain, setConsentAgain] = useState(false);
  const price = useMembershipPrice();
  const [refundOn, setRefundOn] = useState(false); // delete dialog: member backed out and got their money back

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/members");
    if (res.ok) setRows(put("admin:members", (await res.json()).members as Member[]));
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  function open(d: Dialogs, initial = "") {
    setDialog(d); setValue(initial); setTemplate(null); setError(""); setRefundOn(false); setConsentAgain(false); setPin("");
    if (d?.kind === "streak") {
      setStreakView(null);
      fetch(`/api/admin/members/${d.m.id}/streak`).then((r) => r.json()).then(setStreakView);
    }
  }
  function close() { bridge.cancel(); setDialog(null); }

  /** Sends a request, refreshes the list, and (for fingerprint changes) tells the bridge to re-download templates. */
  async function act(url: string, method: string, body?: unknown, after?: (data: Record<string, string>) => void, resync = false) {
    setBusy(true); setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(pin ? { [PIN_HEADER]: pin } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); if (String(data.code ?? "").startsWith("pin_")) setPin(""); return; }
    if (resync) bridge.sync();
    await load();
    if (after) after(data); else setDialog(null);
  }

  const m = dialog && dialog.kind !== "info" ? dialog.m : null;

  // ---- numbers for the four summary cards and the filter chips (all from the real member list) ----
  const all = rows ?? [];
  const count = (st: Member["status"]) => all.filter((r) => r.status === st).length;
  const dueSoon = all.filter((r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 7).length;
  const enrolled = all.length ? Math.round((all.filter((r) => r.fingers > 0).length / all.length) * 100) : 0;
  const avgStreak = all.length ? all.reduce((n, r) => n + r.streak, 0) / all.length : 0;

  const needle = q.trim().toLowerCase();
  const visible = all
    .filter((r) => (filter === "all" ? true : r.status === filter))
    .filter((r) => !needle || r.fullName.toLowerCase().includes(needle) || r.username.toLowerCase().includes(needle))
    .sort((a, b) => sort === "name" ? a.fullName.localeCompare(b.fullName)
      : sort === "streak" ? b.streak - a.streak
      : (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));

  const CHIPS: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "All", n: all.length }, { key: "active", label: "Active", n: count("active") },
    { key: "expiring", label: "Expiring soon", n: count("expiring") }, { key: "expired", label: "Expired", n: count("expired") },
  ];

  return (
    <div className="min-w-0">
      <PageHeader title="Members" description="Renew, edit, re-enroll fingerprints and check streaks.">
        <ExportButton href="/api/admin/members?format=csv" className="bg-card" />
        <Link href="/admin/register" className={buttonVariants({ })}>New member</Link>
      </PageHeader>

      <BridgeBanner className="mb-5" />

      {rows === null ? <StripSkeleton /> : <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
        {([
          ["Active members", String(count("active") + count("expiring")), `${all.length} in total`, "text-brand"],
          ["Due within 7 days", String(dueSoon), dueSoon ? "ask them to renew" : "nobody yet", dueSoon ? "text-warn" : ""],
          ["Can scan in", `${enrolled}%`, `${all.filter((r) => r.fingers > 0).length} of ${all.length} have a fingerprint`, ""],
          ["Average streak", avgStreak.toFixed(1), "days, across everyone", ""],
        ] as const).map(([label, value, note, tone]) => (
          <div key={label} className="bg-card px-5 py-4">
            <div className="text-[0.8125rem] text-muted-foreground">{label}</div>
            <div className={`numeral mt-1 text-4xl ${tone}`}>{value}</div>
            <div className="mt-1 text-[0.8125rem] text-muted-foreground">{note}</div>
          </div>
        ))}
      </section>}

      <section className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3" aria-label="Filters">
        <div className="relative w-full min-w-56 sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 pl-10" placeholder="Search name or username…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
          {CHIPS.map((c) => (
            <button key={c.key} type="button" onClick={() => setFilter(c.key)} aria-pressed={filter === c.key}
              className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${filter === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80 hover:text-foreground"}`}>
              {c.label} ({c.n})
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-lg border bg-card px-3 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30">
            <option value="expiry">Expiry date (nearest)</option><option value="name">Name (A to Z)</option><option value="streak">Longest streak</option>
          </select>
        </label>
      </section>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table className="[&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Member</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Expires</TableHead>
              <TableHead className="hidden xl:table-cell">Streak</TableHead><TableHead className="hidden md:table-cell">Prints</TableHead><TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null && Array.from({ length: 3 }, (_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)}
            {rows !== null && visible.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No members match.</TableCell></TableRow>}
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-brand">
                      {initials(r.fullName)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.fullName}</div>
                      <div className="max-w-52 truncate text-[0.8125rem] text-muted-foreground xl:max-w-none">@{r.username} · Joined {r.joinedOn}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-[0.8125rem] font-semibold ${STATUS[r.status].pill}`}>{STATUS[r.status].label}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="font-semibold tabular-nums">{r.expiryDate ?? "-"}</div>
                  {r.daysLeft !== null && r.daysLeft >= 0 && <div className="mt-0.5 text-[0.8125rem] text-muted-foreground">{r.daysLeft} day{r.daysLeft === 1 ? "" : "s"} left</div>}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <span className="numeral text-2xl">{r.streak}</span> <span className="text-[0.8125rem] text-muted-foreground">day{r.streak === 1 ? "" : "s"}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.fingers > 0
                    ? <span className="inline-flex rounded-md bg-ok-soft px-2.5 py-1 text-[0.8125rem] font-semibold text-ok">{r.fingers} enrolled</span>
                    : <span className="inline-flex rounded-md bg-bad-soft px-2.5 py-1 text-[0.8125rem] font-semibold text-bad">{r.consent ? "None enrolled" : "Consent withdrawn"}</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="sm" onClick={() => open({ kind: "renew", m: r })}>Renew</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${r.fullName}`} />}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuItem onClick={() => open({ kind: "manual", m: r })}><ClipboardPen /> Manual check-in or out</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "streak", m: r })}><Flame /> View streak</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "edit", m: r }, r.fullName)}><Pencil /> Edit name</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "reenroll", m: r })}><Fingerprint /> Re-enroll fingerprint</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open({ kind: "reset", m: r })}><KeyRound /> Reset password</DropdownMenuItem>
                        {r.fingers > 0 && <DropdownMenuItem onClick={() => open({ kind: "withdraw", m: r })}><ShieldOff /> Remove fingerprints</DropdownMenuItem>}
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
        <div className="border-t px-5 py-3 text-sm text-muted-foreground">Showing {visible.length} of {all.length} member{all.length === 1 ? "" : "s"}</div>
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
                <div className="text-sm text-muted-foreground">Membership fee, 30 days</div>
                <div className="numeral text-4xl"><span className="mr-1.5 align-top font-sans text-lg font-medium text-muted-foreground">₱</span>{price ?? "…"}</div>
              </div>
              <PinField value={pin} onChange={setPin} autoFocus />
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy || price === null || pin.length !== 4} onClick={() => act(`/api/admin/members/${m.id}/renew`, "POST", undefined,
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
              {!m.consent && (
                <div className="flex items-start gap-3 rounded-md border bg-muted p-3">
                  <Checkbox id="consent-again" checked={consentAgain} onCheckedChange={(v) => setConsentAgain(v === true)} className="mt-0.5" />
                  <Label htmlFor="consent-again" className="block text-sm font-normal leading-relaxed"><b className="font-semibold">They withdrew consent earlier. New consent:</b> {CONSENT_TEXT}</Label>
                </div>
              )}
              <FingerEnroll label="Primary finger" template={template} onTemplate={setTemplate} userId={m.id} disabled={!m.consent && !consentAgain} />
              <PinField value={pin} onChange={setPin} />
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy || !template || (!m.consent && !consentAgain) || pin.length !== 4} onClick={() => act(`/api/admin/members/${m.id}/fingerprint`, "PUT", { fingerIndex: 0, template, consent: consentAgain },
                  () => { setDialog(null); toast.success("Fingerprint updated - the scanner uses it right away"); }, true)}>Save fingerprint</Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "manual" && m && (
            <>
              <DialogHeader>
                <DialogTitle>Manual check-in or out</DialogTitle>
                <DialogDescription>Use this only when {m.fullName}&apos;s finger cannot be read. It checks them in, or out if they are already in, and is saved as manual.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <div className="flex flex-wrap gap-2 pb-1">
                  {MANUAL_REASONS.map((t) => (
                    <button key={t} type="button" aria-pressed={value === t} onClick={() => setValue(t)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${value === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>{t}</button>
                  ))}
                </div>
                <Input id="reason" className="h-10" value={value} onChange={(e) => setValue(e.target.value)} maxLength={200} placeholder="Or type another reason" />
              </div>
              {error && <p role="alert" className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy || value.trim().length < 5} onClick={() => act(`/api/admin/members/${m.id}/manual-checkin`, "POST", { reason: value },
                  (d) => { setDialog(null); toast.success(`${d.status === "checked_in" ? "Checked in" : "Checked out"}: ${m.fullName}, ${d.time}`); })}>
                  {busy ? "Saving…" : "Record visit"}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "withdraw" && m && (
            <>
              <DialogHeader>
                <DialogTitle>Remove fingerprints</DialogTitle>
                <DialogDescription>Use this when <b>{m.fullName}</b> withdraws consent. Their stored fingerprints are deleted. Membership and attendance records stay.</DialogDescription>
              </DialogHeader>
              <PinField value={pin} onChange={setPin} autoFocus />
              {error && <p role="alert" className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button variant="destructive" disabled={busy || pin.length !== 4} onClick={() => act(`/api/admin/members/${m.id}/fingerprint`, "DELETE", undefined,
                  () => { setDialog(null); toast.success("Fingerprints removed"); }, true)}>{busy ? "Removing…" : "Remove fingerprints"}</Button>
              </DialogFooter>
            </>
          )}

          {dialog?.kind === "reset" && m && (
            <>
              <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>Reset <b>{m.fullName}</b> to the default password? They will have to choose a new one at next login.</DialogDescription></DialogHeader>
              <PinField value={pin} onChange={setPin} autoFocus />
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button disabled={busy || pin.length !== 4} onClick={() => act(`/api/admin/members/${m.id}/reset-password`, "POST", undefined,
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
              <PinField value={pin} onChange={setPin} />
              {error && <p className="text-sm text-bad">{error}</p>}
              <DialogFooter>
                <Button variant="destructive" disabled={busy || pin.length !== 4 || (refundOn && !(Number(value) > 0 && Number(value) <= m.paid))}
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
