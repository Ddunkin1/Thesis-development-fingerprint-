"use client";
import { useApi } from "@/lib/use-api";
import { DataTable } from "./DataTable";
import { TableSkeleton } from "./skeletons";

export function ActivityLog() {
  const { data, error } = useApi<{ headers: string[]; rows: string[][] }>("/api/admin/activity");
  if (error) return <p role="alert" className="text-sm text-bad">{error}</p>;
  return data ? <DataTable headers={data.headers} rows={data.rows} empty="Nothing recorded yet." wrap /> : <TableSkeleton />;
}
