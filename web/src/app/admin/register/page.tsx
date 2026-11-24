import { PageHeader } from "@/components/PageHeader";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main>
      <PageHeader title="Register" description="Add a monthly member with a fingerprint, or log a walk-in for today." />
      <RegisterForm />
    </main>
  );
}
