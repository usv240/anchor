import { configured } from "@/lib/api/run";
import { loadNeed } from "@/lib/need";
import { loadVenueFile } from "@/lib/domain/venues";

/** GET /api/v1/health: what is working right now. Never reveals keys. */
export async function GET() {
  const keys = configured();
  let data = { needZones: 0, venues: 0 };
  try {
    const [{ zones }, venues] = await Promise.all([loadNeed("06037"), loadVenueFile("06037")]);
    data = { needZones: zones.length, venues: venues.venues.length };
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
