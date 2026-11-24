/** Leaderboard privacy: "Juan Dela Cruz" is shown as "Juan C." (first name + last initial). */
export function maskName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ?? "Member";
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
}

/** First name only, for greetings ("Hi, Juan"). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
