import { Skeleton } from "@/components/ui/skeleton";

/** Page title block placeholder (matches PageHeader). */
export function HeaderSkeleton() {
  return (
    <div className="mb-7 space-y-3" aria-hidden>
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Row of small stat boxes (matches the stat strips). */
export function StripSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="space-y-2 bg-card px-5 py-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /></div>
      ))}
    </div>
  );
}

/** Table placeholder: header bar plus rows. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card" aria-hidden>
      <Skeleton className="h-11 w-full rounded-none" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t px-4 py-3.5">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56 max-w-full" /></div>
          <Skeleton className="hidden h-6 w-20 sm:block" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Dashboard shape: hero, stat strip, two panels. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-4 rounded-lg border bg-card px-7 py-6"><Skeleton className="h-4 w-32" /><Skeleton className="h-24 w-28" /></div>
      <StripSkeleton n={6} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-52 w-full" />
    </div>
  );
}

/** Generic admin page: used by loading.tsx while a route loads. */
export function AdminPageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton />
      <StripSkeleton />
      <TableSkeleton />
    </div>
  );
}

/** Ranked list placeholder (leaderboards). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-lg border bg-card" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4"><Skeleton className="h-8 w-8" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-28" /></div><Skeleton className="h-8 w-10" /></div>
      ))}
    </div>
  );
}
