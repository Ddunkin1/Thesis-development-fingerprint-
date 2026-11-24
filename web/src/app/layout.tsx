import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Body text: Plus Jakarta Sans (open, very legible for names, payments and dense tables).
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Condensed athletic display face for headlines, big numbers and the kiosk "scoreboard".
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "CHAQ GYM Attendance",
  description: "Gamified fingerprint attendance for Chaq Gym",
};
export const viewport: Viewport = {
  viewportFit: "cover", // use the whole phone screen, including behind the notch (the member tab bar adds safe-area padding)
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbf7f0" }, { media: "(prefers-color-scheme: dark)", color: "#171410" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${geistMono.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
