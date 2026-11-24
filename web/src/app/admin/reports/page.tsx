import { PageHeader } from "@/components/PageHeader";
import { Reports } from "@/components/Reports";

export default function ReportsPage() {
  return (
    <main>
      <PageHeader title="Reports" description="Each table can be exported to CSV." />
      <Reports />
    </main>
  );
}
