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

/** Three-way switch: Light / Dark / System. `compact` shows icons only (for tight spaces like the kiosk bar). */
export function ThemeToggle({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div role="radiogroup" aria-label="Theme" className={`inline-flex rounded-lg border bg-muted p-0.5 ${className}`}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={active} aria-label={label} title={label}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors
              ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="size-3.5" />{!compact && label}
          </button>
        );
      })}
    </div>
  );
}
