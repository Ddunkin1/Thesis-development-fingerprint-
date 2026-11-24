import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/skeletons";
import { MembersTable } from "@/components/MembersTable";

export default function MembersPage() {
  return (
    <main>
      <Suspense fallback={<AdminPageSkeleton />}>
        <MembersTable />
      </Suspense>
    </main>
  );
}
