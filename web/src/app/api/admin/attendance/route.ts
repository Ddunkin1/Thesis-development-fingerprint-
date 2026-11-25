// GET /api/admin/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&q=name[&format=csv] -> attendance history.
import { requireRole, requireUnlocked, json } from "@/lib/guard";
import { csvResponse } from "@/lib/csv";
import { ReportInputError, attendanceHistory, parseRange } from "@/services/report-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const sp = new URL(req.url).searchParams;
  try {
    const { from, to } = parseRange(sp.get("from"), sp.get("to"));
    const table = await attendanceHistory(from, to, (sp.get("q") ?? "").slice(0, 100));
    if (sp.get("format") === "csv") {
      const locked = await requireUnlocked(auth.session);
      if (locked) return locked;
    }
    if (sp.get("format") === "csv") return csvResponse(`attendance_${from}_to_${to}.csv`, table.headers, table.rows);
    return json({ from, to, ...table });
  } catch (e) {
    if (e instanceof ReportInputError) return json({ error: e.message }, 400);
    throw e;
  }
}
