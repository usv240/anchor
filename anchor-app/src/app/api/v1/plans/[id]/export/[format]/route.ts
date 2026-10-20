import { problem } from "@/lib/api/http";
import { toCsv, toGeoJson, toIcs } from "@/lib/domain/exports";
import { getPlan } from "@/lib/store";

const FORMATS = {
  csv: { type: "text/csv; charset=utf-8", make: toCsv },
  geojson: { type: "application/geo+json", make: toGeoJson },
  ics: { type: "text/calendar; charset=utf-8", make: (p: Parameters<typeof toIcs>[0]) => toIcs(p) },
  json: { type: "application/json", make: (p: unknown) => JSON.stringify(p, null, 2) },
} as const;

/** GET /api/v1/plans/{id}/export/{csv|geojson|ics|json}: download a plan for other tools. */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/plans/[id]/export/[format]">) {
  const { id, format } = await ctx.params;
  const f = FORMATS[format as keyof typeof FORMATS];
  if (!f) return problem(400, "Format must be csv, geojson, ics or json.");
  const stored = await getPlan(id);
  if (!stored) return problem(404, "No plan with that id.");
  return new Response(f.make(stored.plan as never), {
    headers: {
      "Content-Type": f.type,
      "Content-Disposition": `attachment; filename="anchor-${id}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
