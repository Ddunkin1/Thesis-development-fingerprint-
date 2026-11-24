import { Skeleton } from "@/components/ui/skeleton";

// Shown while a member screen loads.
export default function Loading() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full rounded-2xl" /><Skeleton className="h-24 w-full" />
    </div>
  );
}
