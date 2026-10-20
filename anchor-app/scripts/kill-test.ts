/**
 * Day-1 kill test K1 (anchor/PLAN.md, section 6):
 * "Does Qloo know the barbershops and salons in South LA's high-need zones?"
 *
 * Ground truth: City of Los Angeles Office of Finance, "Listing of Active
 * Businesses" (data.lacity.org 6rrh-rzua, CC0), NAICS 812111 barber shops and
 * 812112 beauty salons. OpenStreetMap is too sparse here: in the top 5 zones it
 * tags 6 barbershops, against 193 licensed ones (docs/osm-coverage-check.md).
 *
 * For the top N zones (by estimated untreated adults):
 *   1. Count licensed barbers and salons inside the zone.
 *   2. If QLOO_API_KEY is set, ask Qloo for places in the zone (plus a pass
 *      with hair-related tags), and count licensed businesses Qloo also knows
 *      (normalised name match within 150 m).
 * Pass if Qloo knows at least 50% of licensed barbers and salons.
 *
 * Usage:  npx tsx scripts/kill-test.ts [zones=5]
 * Output: docs/kill-tests.md (counts only, never raw Qloo responses).
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { QlooClient } from "../src/lib/qloo/client";

type Ring = number[][];
type ZoneFeature = {
  properties: { zoneId: string; wkt: string; estUntreatedAdults: number };
  geometry: { coordinates: Ring[] };
};
type Licence = {
  street_address?: string;
  business_name?: string;
  dba_name?: string;
  naics: string;
  location_1?: { latitude?: string; longitude?: string };
};
type QlooPlace = { name: string; location?: { lat: number; lon: number }; properties?: { address?: string } };

const ROOT = path.resolve(__dirname, "..");
const N = Number(process.argv[2] ?? 5);
const HAIR = new Set(["812111", "812112"]);

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|llc|inc|corp|co|shop|shoppe|salon|barbershop|barber|barbers|studio|beauty|hair|lounge)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function metres(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function qlooPlaces(client: QlooClient, wkt: string, hairTagIds: string[]): Promise<QlooPlace[]> {
  type R = { results?: { entities?: QlooPlace[] } };
  const seen = new Map<string, QlooPlace>();
  const base = { "filter.type": "urn:entity:place", "filter.location": wkt, take: 50 };
  const passes: Record<string, string | number>[] = [base];
  if (hairTagIds.length) passes.push({ ...base, "filter.tags": hairTagIds.join(","), "operator.filter.tags": "union" });
  for (const params of passes) {
    for (let page = 1; page <= 3; page++) {
      const r = await client.insights<R>({ ...params, page });
      for (const p of r.data.results?.entities ?? []) seen.set(p.name, p);
    }
  }
  return [...seen.values()];
}

async function main() {
  const zones = (
    JSON.parse(await readFile(path.join(ROOT, "public/data/need/06037/zones.geojson"), "utf8")) as { features: ZoneFeature[] }
  ).features.slice(0, N);
  const licences = (JSON.parse(await readFile(path.join(ROOT, "data/raw/lacity/hair_businesses.json"), "utf8")) as Licence[])
    .filter((l) => HAIR.has(l.naics) && Number(l.location_1?.latitude))
    .map((l) => ({
      names: [l.business_name, l.dba_name].filter((n): n is string => Boolean(n)).map(normName).filter(Boolean),
      house: /^\s*(\d+)/.exec(l.street_address ?? "")?.[1] ?? "",
      barber: l.naics === "812111",
      lat: Number(l.location_1!.latitude),
      lon: Number(l.location_1!.longitude),
    }));

  let key = process.env.QLOO_API_KEY;
  if (!key) {
    try {
      key = /^QLOO_API_KEY=(.*)$/m.exec(await readFile(path.join(ROOT, ".env.local"), "utf8"))?.[1]?.trim() || undefined;
    } catch {
      key = undefined;
    }
  }
  const client = key ? new QlooClient({ apiKey: key, budget: N * 6 + 6 }) : null;
  // Exact place-category tags, confirmed with a probe on Oct 19 (GET /v2/tags?filter.query=barber).
  let hairTagIds: string[] = [];
  if (client) {
    type T = { results?: { tags?: { id: string; type: string; name: string }[] } };
    for (const q of ["barber shop", "hair salon", "beauty salon"]) {
      const r = await client.tags<T>(q);
      hairTagIds.push(...(r.data.results?.tags ?? []).filter((t) => t.type === "urn:tag:category:place").slice(0, 2).map((t) => t.id));
    }
    hairTagIds = [...new Set(hairTagIds)];
    console.log("hair tags:", hairTagIds.join(", "));
  }

  const rows: string[] = [];
  let licensedTotal = 0;
  let matchedTotal = 0;

  for (const z of zones) {
    const ring = z.geometry.coordinates[0];
    const inZone = licences.filter((l) => pointInRing(l.lon, l.lat, ring));
    licensedTotal += inZone.length;
    let qlooCount: number | string = "not run (no key)";
    let matched = 0;
    if (client) {
      const places = await qlooPlaces(client, z.properties.wkt, hairTagIds);
      qlooCount = places.length;
      matched = inZone.filter((l) =>
        places.some((p) => {
          const n = normName(p.name);
          const near = p.location ? metres(p.location, l) : Infinity;
          const sameName = n !== "" && l.names.includes(n) && near < 150;
          const house = /^\s*(\d+)/.exec(p.properties?.address ?? "")?.[1] ?? "";
          const sameDoor = l.house !== "" && house === l.house && near < 100;
          return sameName || sameDoor;
        }),
      ).length;
      matchedTotal += matched;
    }
    rows.push(
      `| ${z.properties.zoneId} | ${z.properties.estUntreatedAdults.toLocaleString("en-US")} | ${inZone.length} (${inZone.filter((l) => l.barber).length} barbers) | ${qlooCount} | ${client ? matched : "n/a"} |`,
    );
  }

  const rate = client && licensedTotal ? matchedTotal / licensedTotal : null;
  const verdict =
    rate === null
      ? "PENDING: ground truth is ready. Run again with QLOO_API_KEY set."
      : rate >= 0.5
        ? `PASS: Qloo knows ${(rate * 100).toFixed(0)}% of licensed barbers and salons in these zones.`
        : `FAIL: Qloo knows ${(rate * 100).toFixed(0)}%. Check name matching by hand on 20 cases before switching to Hooked.`;

  const md = [
    "# Kill test K1: does Qloo know the barbershops and salons in high-need zones?",
    "",
    `Run: ${new Date().toISOString()}. Zones: top ${N} in Los Angeles County by estimated untreated adults.`,
    "Ground truth: City of LA active business licences, NAICS 812111 (barber shops) and 812112 (beauty salons).",
    "",
    "| Zone | Est. untreated adults | Licensed barbers and salons | Qloo places returned | Licensed ones Qloo knows |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    `**Verdict:** ${verdict}`,
    "",
    "Notes:",
    "- City licences cover the City of Los Angeles only. Zones that cross into other cities (for example Inglewood) undercount.",
    "- 'Active' means the owner has not reported closing, so some licensed businesses may have closed.",
    "- A match is the same normalised name within 150 m, or the same house number within 100 m. Spot-check misses by hand.",
    "- Source: City of Los Angeles Office of Finance, Listing of Active Businesses (data.lacity.org, 6rrh-rzua), CC0.",
  ].join("\n");

  await mkdir(path.join(ROOT, "docs"), { recursive: true });
  await writeFile(path.join(ROOT, "docs/kill-tests.md"), md + "\n");
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
