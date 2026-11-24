"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light / dark / system theme. next-themes puts the "dark" class on <html> (before first paint, so there is no
 * flash) and remembers the choice in localStorage. Default is dark (the gym's look); "System" follows the PC.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange storageKey="chaq-theme">
      {children}
    </NextThemesProvider>
  );
}
