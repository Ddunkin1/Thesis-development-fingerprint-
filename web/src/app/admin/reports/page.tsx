import { PinGate } from "@/components/PinGate";
import { PageHeader } from "@/components/PageHeader";
import { Reports } from "@/components/Reports";

export default function ReportsPage() {
  return (
    <main>
      <PageHeader title="Reports" description="Each table can be exported to CSV." />
      <PinGate><Reports /></PinGate>
    </main>
  );
}
