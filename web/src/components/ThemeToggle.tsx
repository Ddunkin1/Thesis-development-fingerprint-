"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

// true only in the browser after hydration (the saved theme is unknown on the server)
const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * Three-way switch: Light / Dark / System.
 * `compact` shows icons only; `block` stretches it to the full width of its container (sidebar).
 */
export function ThemeToggle({ compact = false, block = false, className = "" }: { compact?: boolean; block?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div role="radiogroup" aria-label="Theme" className={`${block ? "flex" : "inline-flex"} rounded-lg border bg-muted p-1 ${className}`}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={active} aria-label={label} title={label}
            onClick={() => setTheme(value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${block ? "flex-1" : ""}
              ${active ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="size-4" />{!compact && !block && label}
          </button>
        );
      })}
    </div>
  );
}
