// Business rules for authentication (password check, forced password change).
import bcrypt from "bcryptjs";
import * as users from "@/data/users";
import type { Session } from "@/lib/session";

// A real bcrypt hash of a random string, compared when the username doesn't exist so that
// "unknown user" and "wrong password" take the same time (prevents username enumeration).
let dummy: string | null = null;
const dummyHash = () => (dummy ??= bcrypt.hashSync(crypto.randomUUID(), 12));

export async function authenticate(username: string, password: string): Promise<Session | null> {
  const user = await users.findByUsername(username);
  const ok = await bcrypt.compare(password, user?.password_hash ?? dummyHash());
  if (!user || !ok) return null;
  return { uid: user.id, role: user.role, name: user.full_name, mustChange: user.must_change_password };
}

export function validateNewPassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain letters and numbers.";
  return null;
}

export async function changePassword(uid: number, current: string, next: string): Promise<string | null> {
  const user = await users.findById(uid);
  if (!user || !(await bcrypt.compare(current, user.password_hash))) return "Current password is incorrect.";
  const problem = validateNewPassword(next);
  if (problem) return problem;
  if (next === current) return "New password must be different from the current one.";
  await users.setPassword(uid, await bcrypt.hash(next, 12), false);
  return null;
}
