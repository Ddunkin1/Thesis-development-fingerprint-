import { Kiosk } from "@/components/Kiosk";

// Fullscreen check-in screen (admin only - see proxy.ts). Lives outside /admin so it has no navigation bar.
export default function KioskPage() {
  return <Kiosk />;
}
