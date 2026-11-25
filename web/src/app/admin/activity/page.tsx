import { PinGate } from "@/components/PinGate";
import { PageHeader } from "@/components/PageHeader";
import { ActivityLog } from "@/components/ActivityLog";

export default function ActivityPage() {
  return (
    <main>
      <PageHeader title="Activity log" description="The latest 500 important actions and when they happened." />
      <PinGate><ActivityLog /></PinGate>
    </main>
  );
}
