import { Suspense } from "react";
import { RegisterForm } from "@/components/RegisterForm";

// RegisterForm reads ?mode=walkin (used by the dashboard's "Quick walk-in" button), so it sits in Suspense.
export default function RegisterPage() {
  return (
    <main>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
