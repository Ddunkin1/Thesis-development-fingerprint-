import { AdminPageSkeleton } from "@/components/skeletons";

// Shown while any admin page loads (route change); the page's own skeleton takes over once its code is ready.
export default function Loading() {
  return <AdminPageSkeleton />;
}
