import { PageHeader } from "@/components/PageHeader";
import { Reports } from "@/components/Reports";

export default function ReportsPage() {
  return (
    <main>
      <PageHeader title="Reports" description="Attendance, traffic and income, scan accuracy and inactive members. Every table exports to CSV." />
      <Reports />
    </main>
  );
}
