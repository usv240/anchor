import { loadNeed } from "@/lib/need";

/** GET /api/v1/need: CDC-based need summary and high-need zones (public data only). */
export async function GET() {
  const { summary, zones } = await loadNeed("06037");
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
    geometry: "/data/need/06037/zones.geojson",
  });
}
