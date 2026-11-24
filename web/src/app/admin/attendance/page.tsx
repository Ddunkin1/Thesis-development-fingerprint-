import { PageHeader } from "@/components/PageHeader";
import { RangeReport } from "@/components/RangeReport";

export default function AttendancePage() {
  return (
    <main>
      <PageHeader title="Attendance" description="Check-ins for the selected dates." />
      <RangeReport endpoint="/api/admin/attendance" defaultDays={1} showSearch />
    </main>
  );
}
