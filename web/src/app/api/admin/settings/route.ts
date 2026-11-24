// GET /api/admin/settings -> values the admin pages need to display (currently the fixed membership fee).
import { requireRole, json } from "@/lib/guard";
import { MEMBERSHIP_PRICE } from "@/lib/pricing";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  return json({ membershipPrice: MEMBERSHIP_PRICE });
}
