import { Suspense } from "react";
import { MembersTable } from "@/components/MembersTable";

export default function MembersPage() {
  return (
    <main>
      <Suspense>
        <MembersTable />
      </Suspense>
    </main>
  );
}
