import { Dashboard } from "@/components/Dashboard";
import { PageHeader } from "@/components/PageHeader";

export default function AdminHome() {
  return (
    <main>
      <PageHeader title="Dashboard" description="Live numbers for the gym floor. Refreshes every 30 seconds." />
      <Dashboard />
    </main>
  );
}
