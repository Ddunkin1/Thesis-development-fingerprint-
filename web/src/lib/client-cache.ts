// Tiny in-memory cache for screen data (stale-while-revalidate): a screen you have already opened shows its last data
// instantly while a fresh copy loads in the background. Lives only in the browser tab; cleared on sign-out.
const store = new Map<string, unknown>();

export function peek<T>(key: string): T | null {
  return (store.get(key) as T | undefined) ?? null;
}
export function put<T>(key: string, value: T): T {
  store.set(key, value);
  return value;
}
export function clearCache() {
  store.clear();
}
