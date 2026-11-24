import { MemberNav } from "@/components/member/MemberNav";

// Mobile-first frame for every member screen: one column (max 28rem, centred on bigger screens),
// space at the bottom for the tab bar. Access is enforced by proxy.ts (pages) and requireRole("member") (API).
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <div className="flex-1 px-4 pb-28 pt-5">{children}</div>
      <MemberNav />
    </div>
  );
}
