/**
 * Baseline B1: "AI alone". The same model Anchor's agent uses (Claude Opus 5.5),
 * asked the same question with no tools and no data, as a health worker might
 * ask a chatbot. Its answers are then checked with the same yardsticks as Anchor:
 *
 *   need capture  share of its places that fall in the county's highest-need fifth of tracts
 *   confirmed     share that match an active City of LA business licence (same name within 300 m)
 *   unsuitable    share that look like bars, liquor stores and similar (name check)
 *
 * One request per audience and plan size (16), the same grid as scripts/eval.ts.
 * Writes eval/baseline-ai.json (model answers kept for inspection; no Qloo data).
 * Cost: 16 short requests.
 */
import { readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AGENT_MODEL } from "../src/lib/agent/claude";
import { normName, metres } from "../src/lib/domain/geo";

const env = readFileSync(".env.local", "utf8");
const apiKey = /^ANTHROPIC_API_KEY=(.*)$/m.exec(env)?.[1]?.trim();
if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing in .env.local");
const client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });

const Answer = z.object({
  places: z.array(
    z.object({
      name: z.string(),
      street_address: z.string(),
      city: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      kind: z.string(),
    }),
  ),
});

type Ring = number[][];
type Geom = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const tracts = (JSON.parse(readFileSync("public/data/need/06037/tracts.geojson", "utf8")).features as { properties: { need_pct: number }; geometry: Geom }[]).map((f) => ({
  needPct: f.properties.need_pct,
  polys: f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates,
}));
const needAt = (lat: number, lon: number) => tracts.find((t) => t.polys.some((p) => inRing(lon, lat, p[0])))?.needPct ?? null;

type Lic = { business_name?: string; dba_name?: string; location_1?: { latitude?: string; longitude?: string } };
const licences = (JSON.parse(readFileSync("data/raw/lacity/venues.json", "utf8")) as Lic[])
  .filter((l) => Number(l.location_1?.latitude))
  .map((l) => ({ names: [l.business_name, l.dba_name].filter(Boolean).map((n) => normName(n!)), lat: Number(l.location_1!.latitude), lon: Number(l.location_1!.longitude) }));
const UNSUITABLE = /\b(bar|pub|tavern|lounge|liquor|brewery|brewing|cocktail|night ?club|hookah|smoke|cannabis|dispensary)\b/i;

const audiences = [
  { label: "adults aged 18 to 34", key: "18_to_34/any" },
  { label: "men aged 35 to 54", key: "35_to_54/male" },
  { label: "women aged 35 to 54", key: "35_to_54/female" },
  { label: "adults aged 55 and older", key: "55_plus/any" },
];
const sizes = [10, 15, 25, 40];

const runs: { audience: string; asked: number; places: z.infer<typeof Answer>["places"]; needCapture: number; meanNeedPercentile: number; confirmed: number; unsuitable: number; outsideCounty: number }[] = [];
for (const a of audiences) {
  for (const k of sizes) {
    const res = await client.messages.parse({
      model: AGENT_MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(Answer) },
      messages: [
        {
          role: "user",
          content: `I'm a community health worker planning free blood pressure checks for ${a.label} in Los Angeles County. List ${k} specific local venues (real businesses or public places) in the neighbourhoods where uncontrolled high blood pressure is most common, where these people already go and trust. For each, give the name, street address, city, latitude, longitude and kind of place.`,
        },
      ],
    });
    const places = res.parsed_output?.places ?? [];
    const pcts = places.map((p) => needAt(p.latitude, p.longitude));
    const confirmed = places.filter((p) => licences.some((l) => metres(l, { lat: p.latitude, lon: p.longitude }) < 300 && l.names.includes(normName(p.name)))).length;
    runs.push({
      audience: a.key,
      asked: k,
      places,
      needCapture: places.length ? pcts.filter((x) => x !== null && x > 0.8).length / places.length : 0,
      meanNeedPercentile: places.length ? pcts.reduce<number>((t, x) => t + (x ?? 0), 0) / places.length : 0,
      confirmed: places.length ? confirmed / places.length : 0,
      unsuitable: places.length ? places.filter((p) => UNSUITABLE.test(p.name) || UNSUITABLE.test(p.kind)).length / places.length : 0,
      outsideCounty: places.length ? pcts.filter((x) => x === null).length / places.length : 0,
    });
    const r = runs.at(-1)!;
    console.log(`${a.key.padEnd(14)} k=${String(k).padEnd(3)} got ${places.length}  need ${(r.needCapture * 100).toFixed(0)}%  confirmed ${(r.confirmed * 100).toFixed(0)}%  unsuitable ${(r.unsuitable * 100).toFixed(0)}%  outside ${(r.outsideCounty * 100).toFixed(0)}%`);
  }
}

const mean = (f: (r: (typeof runs)[number]) => number) => Math.round((runs.reduce((t, r) => t + f(r), 0) / runs.length) * 1000) / 1000;
const summary = {
  label: "AI alone (no tools)",
  model: AGENT_MODEL,
  runAt: new Date().toISOString(),
  needCapture: mean((r) => r.needCapture),
  meanNeedPercentile: mean((r) => r.meanNeedPercentile),
  unsuitableRate: mean((r) => r.unsuitable),
  licensedRate: mean((r) => r.confirmed),
  outsideCountyRate: mean((r) => r.outsideCounty),
  categories: mean((r) => new Set(r.places.map((p) => p.kind.toLowerCase())).size),
};
writeFileSync("eval/baseline-ai.json", JSON.stringify({ summary, runs }, null, 2) + "\n");
console.log("\n", summary);
