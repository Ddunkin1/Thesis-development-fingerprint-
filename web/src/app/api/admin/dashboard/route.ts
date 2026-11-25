// GET /api/admin/dashboard -> all numbers for the dashboard page.
import { requireRole, isUnlocked, json } from "@/lib/guard";
import { getDashboard } from "@/services/dashboard-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  return json(await getDashboard(await isUnlocked(auth.session))); // income only after the PIN
}
