import { COUNTIES, COUNTY_FIPS } from "@/lib/domain/counties";
import { configured } from "@/lib/api/run";
import { loadNeed } from "@/lib/need";
import { loadVenueFile } from "@/lib/domain/venues";

/** GET /api/v1/health: what is working right now. Never reveals keys. */
export async function GET() {
  const keys = configured();
  const data: { needZones: number; venues: number; counties: Record<string, { name: string; needZones: number; venues: number }> } = { needZones: 0, venues: 0, counties: {} };
  try {
    for (const fips of COUNTY_FIPS) {
      const [{ zones }, venues] = await Promise.all([loadNeed(fips), loadVenueFile(fips)]);
      data.counties[fips] = { name: COUNTIES[fips].name, needZones: zones.length, venues: venues.venues.length };
      data.needZones += zones.length;
      data.venues += venues.venues.length;
    }
  } catch {
    // reported as zero below
  }
  return Response.json({
    status: data.needZones > 0 && data.venues > 0 ? "ok" : "degraded",
    modes: {
      trust: keys.qloo ? "qloo" : "offline",
      planner: keys.anthropic ? "claude" : "basic",
    },
    data,
    time: new Date().toISOString(),
  });
}
