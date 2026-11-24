/** Wordmark: condensed caps, purple only on "GYM". */
export function Brand({ size = "lg" }: { size?: "sm" | "lg" | "xl" }) {
  const s = size === "xl" ? "text-6xl md:text-8xl" : size === "lg" ? "text-4xl" : "text-xl";
  return (
    <div className={`font-display font-extrabold uppercase leading-none tracking-[0.12em] ${s}`}>
      Chaq <span className="text-brand">Gym</span>
    </div>
  );
}
