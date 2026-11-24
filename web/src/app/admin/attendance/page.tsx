import { PageHeader } from "@/components/PageHeader";
import { RangeReport } from "@/components/RangeReport";

export default function AttendancePage() {
  return (
    <main>
      <PageHeader title="Attendance" description="Who came in and when. Defaults to today." />
      <RangeReport endpoint="/api/admin/attendance" defaultDays={1} showSearch />
    </main>
  );
}
