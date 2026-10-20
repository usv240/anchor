import { COUNTIES, COUNTY_FIPS, DEFAULT_COUNTY, type CountyFips } from "@/lib/domain/counties";
import { gate, problem } from "@/lib/api/http";
import { FAN_AREAS, fanReach } from "@/lib/domain/fans";
import { sharedQlooCache } from "@/lib/qloo/fileCache";

/**
 * GET /api/v1/places/{qlooEntityId}/fans
 * Where this place's fans are concentrated (Qloo heatmap, about 1 km squares),
 * and how many of its strongest fan areas are high-need neighbourhoods.
 * Aggregate taste data only.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/places/[id]/fans">) {
  const g = await gate(req);
  if (g instanceof Response) return g;
  const { id } = await ctx.params;
  if (!/^[0-9A-F-]{36}$/i.test(id)) return problem(400, "That is not a Qloo place id.");
  const apiKey = req.headers.get("x-qloo-key")?.trim() || process.env.QLOO_API_KEY;
  if (!apiKey) return problem(503, "Qloo is not connected on this server yet.");
  try {
    const fips = new URL(req.url).searchParams.get("county") ?? DEFAULT_COUNTY;
    if (!(fips in COUNTIES)) return problem(400, `Counties with data: ${COUNTY_FIPS.join(", ")}.`);
    const r = await fanReach(apiKey, id, { cache: sharedQlooCache(), county: fips });
    return Response.json(
      {
        ...r,
        note: `The ${FAN_AREAS} areas of ${COUNTIES[fips as CountyFips].short} where this place's fans are most concentrated. High need means the county's top fifth of neighbourhoods for untreated high blood pressure (CDC PLACES); 1 in 5 neighbourhoods is high need.`,
        source: "Qloo heatmap with this place as the signal (aggregate taste data, no personal data)",
        via: r.via === "rest" ? "Anchor's Qloo client" : "Qloo's official harness (backup path)",
      },
      { headers: g.headers },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return problem(msg.startsWith("Qloo has no") ? 404 : 502, msg);
  }
}
