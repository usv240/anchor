/**
 * Second pass on the AI-alone baseline (eval/baseline-ai.json):
 *  1. Existence, checked fairly: AI alone suggests churches, parks and libraries,
 *     which are not in business licence records. So each distinct place is looked
 *     up in Qloo's place data (GET /search) and counts as found if a result with a
 *     matching name lies within 500 m of the coordinates the AI gave.
 *  2. Tailoring: how much the AI's lists for different audiences overlap
 *     (Jaccard on place names), to compare with Anchor's 11.5%.
 * Updates eval/baseline-ai.json. Qloo results are cached privately, never written to the repo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { QlooClient } from "../src/lib/qloo/client";
import { FileCache } from "../src/lib/qloo/fileCache";
import { metres, normName } from "../src/lib/domain/geo";

type Place = { name: string; street_address: string; city: string; latitude: number; longitude: number; kind: string };
type Run = { audience: string; asked: number; places: Place[] };
const file = JSON.parse(readFileSync("eval/baseline-ai.json", "utf8")) as { summary: Record<string, unknown>; runs: Run[] };
const key = /^QLOO_API_KEY=(.*)$/m.exec(readFileSync(".env.local", "utf8"))![1].trim();
const client = new QlooClient({ apiKey: key, cache: new FileCache(), budget: 400 });

const distinct = new Map<string, Place>();
for (const r of file.runs) for (const p of r.places) distinct.set(normName(p.name), p);

const sameName = (a: string, b: string) => {
  const x = normName(a);
  const y = normName(b);
  return x !== "" && y !== "" && (x === y || x.includes(y) || y.includes(x));
};

const found = new Map<string, boolean>();
let i = 0;
for (const [k, p] of distinct) {
  i += 1;
  type S = { results?: { name: string; location?: { lat?: number; lon?: number } }[] };
  const r = await client.search<S>(`${p.name} ${p.city}`, "urn:entity:place", 5);
  const hit = (r.data.results ?? []).some(
    (e) => sameName(e.name, p.name) && typeof e.location?.lat === "number" && metres({ lat: e.location.lat!, lon: e.location.lon! }, { lat: p.latitude, lon: p.longitude }) < 500,
  );
  found.set(k, hit);
  if (i % 20 === 0) console.log(`checked ${i} of ${distinct.size}`);
}

const foundRate = (ps: Place[]) => (ps.length ? ps.filter((p) => found.get(normName(p.name))).length / ps.length : 0);
const byAudience = new Map<string, Set<string>>();
for (const r of file.runs) {
  const s = byAudience.get(r.audience) ?? new Set<string>();
  r.places.forEach((p) => s.add(normName(p.name)));
  byAudience.set(r.audience, s);
}
const keys = [...byAudience.keys()];
const overlaps: { a: string; b: string; overlap: number }[] = [];
for (let x = 0; x < keys.length; x++)
  for (let y = x + 1; y < keys.length; y++) {
    const A = byAudience.get(keys[x])!;
    const B = byAudience.get(keys[y])!;
    const inter = [...A].filter((n) => B.has(n)).length;
    overlaps.push({ a: keys[x], b: keys[y], overlap: Math.round((inter / new Set([...A, ...B]).size) * 1000) / 1000 });
  }
const all = file.runs.flatMap((r) => r.places);
const round = (n: number) => Math.round(n * 1000) / 1000;
file.summary = {
  ...file.summary,
  foundInQlooRate: round(all.filter((p) => found.get(normName(p.name))).length / all.length),
  distinctPlaces: distinct.size,
  totalPlaces: all.length,
  meanAudienceOverlap: round(overlaps.reduce((t, o) => t + o.overlap, 0) / overlaps.length),
  audienceOverlap: overlaps,
  perRunFoundInQloo: file.runs.map((r) => round(foundRate(r.places))),
  note: "Existence is checked against Qloo's place data (same name within 500 m). Business-licence matching does not apply: most AI suggestions are churches, parks and libraries.",
};
writeFileSync("eval/baseline-ai.json", JSON.stringify(file, null, 2) + "\n");
console.log({ foundInQloo: file.summary.foundInQlooRate, distinct: distinct.size, total: all.length, meanAudienceOverlap: file.summary.meanAudienceOverlap });
console.log(overlaps);
