// GET /api/admin/register-preview?fullName=Juan%20Dela%20Cruz -> the username/password that WOULD be created.
import { requireRole, json } from "@/lib/guard";
import { previewAccount } from "@/services/registration-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const fullName = new URL(req.url).searchParams.get("fullName") ?? "";
  return json({ preview: await previewAccount(fullName.slice(0, 100)) });
}
