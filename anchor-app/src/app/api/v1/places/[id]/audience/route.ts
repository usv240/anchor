import { gate, problem } from "@/lib/api/http";
import { QlooClient, QlooError } from "@/lib/qloo/client";
import { sharedQlooCache } from "@/lib/qloo/fileCache";
import { harnessCall } from "@/lib/qloo/harness";

/**
 * GET /api/v1/places/{qlooEntityId}/audience
 * Who loves this place: Qloo's demographic affinity by age group and gender
 * (scores centred on 0; above 0 means more than average). Aggregate taste
 * data only; no personal information exists in it.
 */
const AGES = ["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"] as const;
const LABEL: Record<(typeof AGES)[number], string> = {
  "24_and_younger": "24 and under",
  "25_to_29": "25 to 29",
  "30_to_34": "30 to 34",
  "35_to_44": "35 to 44",
  "45_to_54": "45 to 54",
  "55_and_older": "55 and older",
};

export async function GET(req: Request, ctx: RouteContext<"/api/v1/places/[id]/audience">) {
  const g = await gate(req);
  if (g instanceof Response) return g;
  const { id } = await ctx.params;
  if (!/^[0-9A-F-]{36}$/i.test(id)) return problem(400, "That is not a Qloo place id.");
  const apiKey = req.headers.get("x-qloo-key")?.trim() || process.env.QLOO_API_KEY;
  if (!apiKey) return problem(503, "Qloo is not connected on this server yet.");

  type Q = { age?: Record<string, number>; gender?: Record<string, number> };
  type D = { results?: { demographics?: { entity_id: string; query?: Q }[] } };
  const round = (n: number) => Math.round(n * 100) / 100;
  const shape = (q: Q, via: "rest" | "harness") =>
    Response.json(
      {
        placeId: id,
        age: AGES.map((a) => ({ group: a, label: LABEL[a], affinity: round(q.age?.[a] ?? 0) })),
        gender: ["male", "female"].map((gk) => ({ group: gk, label: gk === "male" ? "Men" : "Women", affinity: round(q.gender?.[gk] ?? 0) })),
        note: "Scores are centred on 0. Above 0 means this group likes the place more than average; below 0, less.",
        source: "Qloo demographic insights (aggregate taste data, no personal data)",
        via: via === "rest" ? "Anchor's Qloo client" : "Qloo's official harness (backup path)",
      },
      { headers: g.headers },
    );

  // Primary path: Anchor's own Qloo client.
  let primaryError = "";
  try {
    const client = new QlooClient({ apiKey, cache: sharedQlooCache(), budget: 2 });
    const r = await client.insights<D>({ "filter.type": "urn:demographics", "signal.interests.entities": id });
    const d = r.data.results?.demographics?.find((x) => x.entity_id.toUpperCase() === id.toUpperCase()) ?? r.data.results?.demographics?.[0];
    if (d?.query) return shape(d.query, "rest");
    primaryError = "Qloo has no audience profile for this place.";
  } catch (err) {
    primaryError = err instanceof QlooError ? err.message : (err as Error).message;
  }

  // Backup path: Qloo's official harness MCP tool (works on servers, not serverless).
  try {
    const h = await harnessCall(apiKey, "qloo_audience_demographics", { entity: id, entity_type: "place" });
    const q = (h.results?.[0] as { query?: Q } | undefined)?.query;
    if (h.status === "ok" && q) return shape(q, "harness");
  } catch {
    // fall through to the primary error
  }
  return problem(primaryError.startsWith("Qloo has no") ? 404 : 502, primaryError);
}
