// What counts as an acceptable PIN. Pure, shared by the screen and the server.
const TOO_EASY = new Set(["1234", "4321"]);

export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "The PIN must be exactly 4 numbers.";
  if (/^(\d)\1{3}$/.test(pin) || TOO_EASY.has(pin)) return "That PIN is too easy to guess. Choose another.";
  return null;
}
