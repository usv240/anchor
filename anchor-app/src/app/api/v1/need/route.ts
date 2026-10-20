import { COUNTIES, COUNTY_FIPS, DEFAULT_COUNTY } from "@/lib/domain/counties";
import { loadNeed } from "@/lib/need";

/** GET /api/v1/need?county=06037: CDC-based need summary and high-need zones (public data only). */
export async function GET(req: Request) {
  const fips = new URL(req.url).searchParams.get("county") ?? DEFAULT_COUNTY;
  if (!(fips in COUNTIES)) return Response.json({ error: { status: 400, message: `Counties with data: ${COUNTY_FIPS.join(", ")}.` } }, { status: 400 });
  const { summary, zones } = await loadNeed(fips);
  return Response.json({
    summary,
    zones: zones.map((z, i) => ({
      rank: i + 1,
      zoneId: z.zoneId,
      need: z.need,
      estUntreatedAdults: z.estUntreatedAdults,
      adults: z.adults,
      areaKm2: z.areaKm2,
      centroid: z.centroid,
      tracts: z.tracts,
    })),
    geometry: `/data/need/${fips}/zones.geojson`,
  });
}
