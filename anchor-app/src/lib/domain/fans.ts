import { county, DEFAULT_COUNTY } from "@/lib/domain/counties";
import { needPercentileAt } from "@/lib/need";
import { QlooClient, QlooError, type QlooCache } from "@/lib/qloo/client";
import { harnessCall } from "@/lib/qloo/harness";

/**
 * Fan reach: where a place's fans are concentrated, and how many of those areas
 * are high-need neighbourhoods. A venue whose fans live in high-need areas
 * brings in the people the checks are for, not just passers-by.
 *
 * Primary path: Qloo heatmap with the place as the signal (about 1 km squares).
 * Backup path: the official harness tool qloo_where_popular (same idea).
 * High need = the county's top fifth of census tracts (CDC PLACES), the same cut
 * used everywhere else in Anchor.
 */

export const FAN_AREAS = 20;
export const HIGH_NEED_CUT = 0.8;

export type FanArea = { lat: number; lon: number; affinity: number; highNeed: boolean };
export type FanReach = { placeId: string; areas: FanArea[]; highNeedAreas: number; via: "rest" | "harness" };

export type Cell = { location: { latitude: number; longitude: number }; query?: { affinity?: number } };

export async function shape(placeId: string, cells: Cell[], county: string, via: FanReach["via"]): Promise<FanReach> {
  const located = await Promise.all(
    [...cells]
      .sort((a, b) => (b.query?.affinity ?? 0) - (a.query?.affinity ?? 0))
      .map(async (c) => ({ c, pct: await needPercentileAt(county, { lat: c.location.latitude, lon: c.location.longitude }) })),
  );
  const areas = located
    .filter((x) => x.pct !== null)
    .slice(0, FAN_AREAS)
    .map(({ c, pct }) => ({
      lat: Math.round(c.location.latitude * 1000) / 1000,
      lon: Math.round(c.location.longitude * 1000) / 1000,
      affinity: Math.round((c.query?.affinity ?? 0) * 100) / 100,
      highNeed: (pct ?? 0) > HIGH_NEED_CUT,
    }));
  return { placeId, areas, highNeedAreas: areas.filter((a) => a.highNeed).length, via };
}

export async function fanReach(apiKey: string, placeId: string, opts: { cache?: QlooCache; county?: string; harness?: boolean } = {}): Promise<FanReach> {
  const fips = opts.county ?? DEFAULT_COUNTY;
  const where = county(fips);
  let primaryError = "";
  try {
    const client = new QlooClient({ apiKey, cache: opts.cache, budget: 1 });
    const r = await client.insights<{ results?: { heatmap?: Cell[] } }>({
      "filter.type": "urn:heatmap",
      "signal.interests.entities": placeId,
      "filter.location.query": where.qlooCity,
    });
    const cells = r.data.results?.heatmap ?? [];
    if (cells.length) return shape(placeId, cells, fips, "rest");
    primaryError = "Qloo has no fan map for this place.";
  } catch (err) {
    primaryError = err instanceof QlooError ? err.message : (err as Error).message;
  }
  if (opts.harness !== false) {
    try {
      const h = await harnessCall(apiKey, "qloo_where_popular", { entity: placeId, entity_type: "place", within: where.harnessArea, limit: FAN_AREAS });
      const cells = (h.results ?? []) as Cell[];
      if (h.status === "ok" && cells.length) return shape(placeId, cells, fips, "harness");
    } catch {
      // fall through to the primary error
    }
  }
  throw new Error(primaryError);
}
