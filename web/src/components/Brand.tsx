import { Dumbbell } from "lucide-react";

/** Wordmark: condensed caps, indigo on "GYM". */
export function Brand({ size = "lg" }: { size?: "sm" | "lg" | "xl" }) {
  const s = size === "xl" ? "text-6xl md:text-8xl" : size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div className={`font-display font-extrabold uppercase leading-none tracking-[0.1em] ${s}`}>
      Chaq <span className="text-brand">Gym</span>
    </div>
  );
}

/** Square logo mark used next to the wordmark in the sidebar. */
export function BrandMark({ className = "size-11" }: { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card ${className}`} aria-hidden>
      <Dumbbell className="size-1/2" />
    </span>
  );
}
