/**
 * Day-1 probe: learn the real shape of Qloo responses with a handful of calls.
 * Raw responses are saved to data/qloo-cache/ (git-ignored, never published).
 * Prints only structure and counts, never the key.
 *
 * Usage: npx tsx scripts/qloo-probe.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const BASE = "https://hackathon.api.qloo.com";

async function env(name: string): Promise<string> {
  if (process.env[name]) return process.env[name]!;
  const text = await readFile(path.join(ROOT, ".env.local"), "utf8");
  const m = new RegExp(`^${name}=(.*)$`, "m").exec(text);
  return m?.[1]?.trim() ?? "";
}

function shape(v: unknown, depth = 0): unknown {
  if (depth > 4) return "...";
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1), `(${v.length} items)`] : [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).slice(0, 25).map(([k, x]) => [k, shape(x, depth + 1)]));
  return typeof v;
}

async function main() {
  const key = await env("QLOO_API_KEY");
  if (!key) throw new Error("QLOO_API_KEY missing");
  const zones = JSON.parse(await readFile(path.join(ROOT, "public/data/need/06037/zones.geojson"), "utf8")).features;
  const wkt: string = zones[0].properties.wkt;
  await mkdir(path.join(ROOT, "data/qloo-cache"), { recursive: true });

  const probes: [string, string, Record<string, string>][] = [
    ["tags-barber", "/v2/tags", { "filter.query": "barber" }],
    ["places-zone1-plain", "/v2/insights", { "filter.type": "urn:entity:place", "filter.location": wkt, take: "10" }],
    [
      "places-zone1-audience",
      "/v2/insights",
      {
        "filter.type": "urn:entity:place",
        "filter.location": wkt,
        "signal.demographics.age": "35_to_44,45_to_54",
        "signal.demographics.gender": "male",
        "feature.explainability": "true",
        take: "10",
      },
    ],
  ];

  for (const [name, p, params] of probes) {
    const url = `${BASE}${p}?${new URLSearchParams(params)}`;
    const t0 = Date.now();
    const res = await fetch(url, { headers: { "X-Api-Key": key, Accept: "application/json" } });
    const body = await res.text();
    await writeFile(path.join(ROOT, "data/qloo-cache", `probe-${name}.json`), body);
    console.log(`\n=== ${name}: HTTP ${res.status} in ${Date.now() - t0} ms, ${body.length} bytes, url length ${url.length}`);
    try {
      const j = JSON.parse(body);
      console.log(JSON.stringify(shape(j), null, 1).slice(0, 2500));
    } catch {
      console.log(body.slice(0, 400));
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
