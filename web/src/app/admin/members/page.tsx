import { MembersTable } from "@/components/MembersTable";
import { PageHeader } from "@/components/PageHeader";

export default function MembersPage() {
  return (
    <main>
      <PageHeader title="Members" description="Renew, edit, re-enroll fingerprints and review streaks." />
      <MembersTable />
    </main>
  );
}
