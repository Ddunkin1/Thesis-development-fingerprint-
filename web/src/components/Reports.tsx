"use client";
import { useState } from "react";
import { RangeReport } from "./RangeReport";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { key: "attendance", label: "Attendance", range: true, group: true, note: "Check-ins and unique members per day, week or month." },
  { key: "traffic", label: "Monthly vs walk-in", range: true, group: true, note: "Visits and income of monthly members compared with walk-ins." },
  { key: "streaks", label: "Top streaks", range: false, group: false, note: "Members with the longest attendance streaks of all time." },
  { key: "accuracy", label: "Scan accuracy", range: true, group: false, note: "Share of scans where the fingerprint was recognised (from the scan log)." },
  { key: "inactive", label: "Inactive 7+ days", range: false, group: false, note: "Members who have not attended for 7 days or more." },
] as const;

export function Reports() {
  const [key, setKey] = useState<(typeof TABS)[number]["key"]>("attendance");
  const tab = TABS.find((t) => t.key === key)!;
  return (
    <div>
      <Tabs value={key} onValueChange={(v) => setKey(v as typeof key)}>
        <TabsList className="h-auto flex-wrap">{TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>
      </Tabs>
      <p className="mb-4 mt-3 text-sm text-muted-foreground">{tab.note}</p>
      <RangeReport key={tab.key} endpoint="/api/admin/reports" defaultDays={30} extra={{ section: tab.key }} showRange={tab.range} showGroup={tab.group} />
    </div>
  );
}
