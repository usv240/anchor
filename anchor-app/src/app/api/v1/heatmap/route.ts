import { z } from "zod";
import { gate, problem } from "@/lib/api/http";
import { AGE_GROUPS, type AgeGroup } from "@/lib/domain/types";
import { qlooAgeParam } from "@/lib/domain/trust";
import { QlooClient, QlooError } from "@/lib/qloo/client";
import { sharedQlooCache } from "@/lib/qloo/fileCache";

/**
 * GET /api/v1/heatmap?ages=35_to_54&gender=male
 * Where a group's tastes concentrate across Los Angeles: Qloo heatmap cells
 * (about 1 km geohash squares) with a 0 to 1 affinity. Shown next to the need
 * layer, it answers "where is this group, and where is the need?"
 */
const Query = z.object({
  ages: z
    .string()
    .default("35_to_54")
    .transform((s) => s.split(",").filter((a): a is AgeGroup => a in AGE_GROUPS))
    .refine((a) => a.length > 0, "Choose at least one age group."),
  gender: z.enum(["any", "male", "female"]).default("any"),
});

export async function GET(req: Request) {
  const g = await gate(req);
  if (g instanceof Response) return g;
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return problem(400, "Use ages=18_to_34,35_to_54,55_plus and gender=any, male or female.");
  const apiKey = req.headers.get("x-qloo-key")?.trim() || process.env.QLOO_API_KEY;
  if (!apiKey) return problem(503, "The taste map needs Qloo, which is not connected on this server yet.");

  const params: Record<string, string | number> = {
    "filter.type": "urn:heatmap",
    "filter.location.query": "Los Angeles",
    "signal.demographics.age": qlooAgeParam(parsed.data.ages),
  };
  if (parsed.data.gender !== "any") params["signal.demographics.gender"] = parsed.data.gender;
  try {
    const client = new QlooClient({ apiKey, cache: sharedQlooCache(), budget: 2 });
    type H = { results?: { heatmap?: { location: { latitude: number; longitude: number; geohash: string }; query: { affinity: number } }[] } };
    const r = await client.insights<H>(params, (d) => `${d.results?.heatmap?.length ?? 0} heatmap cells`);
    const cells = (r.data.results?.heatmap ?? [])
      .filter((c) => c.query.affinity >= 0.5) // the upper half: where this group's tastes are stronger than the city's middle
      .map((c) => ({ lat: Math.round(c.location.latitude * 1e5) / 1e5, lon: Math.round(c.location.longitude * 1e5) / 1e5, geohash: c.location.geohash, affinity: Math.round(c.query.affinity * 100) / 100 }));
    return Response.json(
      { cells, source: "Qloo heatmap insights (aggregate taste data, no personal data)", note: "Upper half of affinity only. Affinity is ranked within Los Angeles, 0 to 1." },
      { headers: g.headers },
    );
  } catch (err) {
    return problem(err instanceof QlooError ? 502 : 500, (err as Error).message);
  }
}
