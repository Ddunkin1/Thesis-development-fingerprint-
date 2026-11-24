// Tiny in-memory sliding-window rate limiter used for login attempts.
// Good enough for a single Railway instance; use Redis if the app is ever scaled horizontally.
const hits = new Map<string, number[]>();

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function reset(key: string) {
  hits.delete(key);
}
