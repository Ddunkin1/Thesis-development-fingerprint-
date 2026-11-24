// GET /api/member/me -> everything the member's home / "me" screens show. Members only; a member only ever gets THEIR OWN data
// (the id comes from the signed session cookie, never from the request).
import { requireRole, json } from "@/lib/guard";
import { PortalError, getPortal } from "@/services/member-portal-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "member");
  if (auth.error) return auth.error;
  try {
    return json(await getPortal(auth.session.uid));
  } catch (e) {
    if (e instanceof PortalError) return json({ error: e.message }, 404);
    throw e;
  }
}
