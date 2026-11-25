import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Generic read-only table for {headers, rows} results. Numeric-looking columns are right-aligned. */
export function DataTable({ headers, rows, empty = "No data for this range.", wrap = false }: {
  headers: string[]; rows: (string | number)[][]; empty?: string; wrap?: boolean; // let long text wrap (every column but the first) instead of scrolling
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table className={wrap ? "[&_td]:px-2 [&_th]:px-2" : ""}>
        <TableHeader>
          <TableRow>{headers.map((h, i) => <TableHead key={h} className={`whitespace-nowrap px-3 ${i > 0 && typeof rows[0]?.[i] === "number" ? "text-right" : ""}`}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">{empty}</TableCell></TableRow>}
          {rows.map((r, i) => (
            <TableRow key={i} className={r[0] === "TOTAL" ? "font-semibold" : ""}>
              {r.map((c, j) => <TableCell key={j} className={`${wrap && j > 0 ? "whitespace-normal break-words" : "whitespace-nowrap"} px-3 tabular-nums ${typeof c === "number" ? "text-right" : ""}`}>{c}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
