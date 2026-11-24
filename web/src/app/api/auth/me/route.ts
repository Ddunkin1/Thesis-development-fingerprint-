// GET /api/auth/me -> who is signed in (name + role), for the avatar / name in the admin and member frames.
import { json, getSession } from "@/lib/guard";

export async function GET() {
  const s = await getSession();
  if (!s) return json({ error: "Not signed in." }, 401);
  return json({ name: s.name, role: s.role });
}
