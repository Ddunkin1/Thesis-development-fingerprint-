// Pure rules for generating member usernames and default passwords (easy to explain and unit-test).
//   "Juan Dela Cruz" -> lastname "cruz" -> username "cruz2026", default password "cruzChaq".

/** Lastname = last word of the full name, lower-cased, letters/digits only. */
export function lastName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  const last = words[words.length - 1] ?? "";
  return last
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const YEAR_SUFFIX = "2026";

export function baseUsername(fullName: string): string {
  return lastName(fullName) + YEAR_SUFFIX;
}

export function defaultPassword(fullName: string): string {
  return lastName(fullName) + "Chaq";
}

/** cruz2026, then cruz2026a, cruz2026b ... cruz2026z, then cruz202627, cruz202628 ... */
export function pickUsername(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (const c of "abcdefghijklmnopqrstuvwxyz") if (!taken.has(base + c)) return base + c;
  for (let i = 27; ; i++) if (!taken.has(base + i)) return base + i;
}
