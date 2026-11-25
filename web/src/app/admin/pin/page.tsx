import { PageHeader } from "@/components/PageHeader";
import { PinSettings } from "@/components/PinSettings";

export default function PinPage() {
  return (
    <main>
      <PageHeader title="PIN" description="4 numbers that protect deleting, renewing, fingerprint changes, password resets, income, reports and exports." />
      <PinSettings />
    </main>
  );
}
