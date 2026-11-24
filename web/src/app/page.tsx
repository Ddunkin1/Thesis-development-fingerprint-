import { redirect } from "next/navigation";

// proxy.ts redirects signed-in users by role; anyone who reaches here goes to the login page.
export default function Home() {
  redirect("/login");
}
