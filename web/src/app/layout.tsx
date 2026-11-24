import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Condensed athletic display face for headings, counters and the kiosk "scoreboard".
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "CHAQ GYM Attendance",
  description: "Gamified fingerprint attendance for Chaq Gym",
};
export const viewport: Viewport = { themeColor: "#09090b", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
