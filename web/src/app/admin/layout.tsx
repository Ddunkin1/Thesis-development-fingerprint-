import { AdminShell } from "@/components/AdminShell";

// Shell shared by every admin page. Access is enforced by proxy.ts (pages) and requireRole (API routes).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
