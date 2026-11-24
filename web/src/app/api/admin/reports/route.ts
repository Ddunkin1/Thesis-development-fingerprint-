// GET /api/admin/reports?section=attendance|traffic|streaks|accuracy|inactive&from&to&group=day|week|month[&format=csv]
import { requireRole, json } from "@/lib/guard";
import { csvResponse } from "@/lib/csv";
import { ReportInputError, SECTIONS, buildReport, parseGroup, parseRange, type Section } from "@/services/report-service";

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (auth.error) return auth.error;
  const sp = new URL(req.url).searchParams;
  const section = sp.get("section") as Section;
  if (!SECTIONS.includes(section)) return json({ error: "Unknown report." }, 400);
  try {
    const { from, to } = parseRange(sp.get("from"), sp.get("to"));
    const group = parseGroup(sp.get("group"));
    const table = await buildReport(section, from, to, group);
    if (sp.get("format") === "csv") return csvResponse(`report_${section}_${from}_to_${to}.csv`, table.headers, table.rows);
    return json({ section, from, to, group, ...table });
  } catch (e) {
    if (e instanceof ReportInputError) return json({ error: e.message }, 400);
    throw e;
  }
}
