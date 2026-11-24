import { PageHeader } from "@/components/PageHeader";
import { Reports } from "@/components/Reports";

export default function ReportsPage() {
  return (
    <main>
      <PageHeader eyebrow="Insights" title="Reports & analytics" description="Attendance, traffic and income, scan accuracy and inactive members. Every table exports to CSV." />
      <Reports />
    </main>
  );
}
