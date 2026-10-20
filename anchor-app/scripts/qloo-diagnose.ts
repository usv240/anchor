/**
 * Diagnose the kill-test result: how many barbershops and salons does Qloo
 * itself know in a zone, and how do their names compare with licence names?
 * Raw responses go to data/qloo-cache/ (git-ignored). Prints a side-by-side
 * sample for hand checking.
 *
 * Usage: npx tsx scripts/qloo-diagnose.ts [zoneIndex=0]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const BASE = "https://hackathon.api.qloo.com";
const HAIR_TAGS = ["urn:tag:category:place:barber_shop", "urn:tag:category:place:hair_salon", "urn:tag:category:place:beauty_salon"];

type Ring = number[][];
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function main() {
  const idx = Number(process.argv[2] ?? 0);
  const key = /^QLOO_API_KEY=(.*)$/m.exec(await readFile(path.join(ROOT, ".env.local"), "utf8"))?.[1]?.trim();
  if (!key) throw new Error("QLOO_API_KEY missing in .env.local");
  const zone = JSON.parse(await readFile(path.join(ROOT, "public/data/need/06037/zones.geojson"), "utf8")).features[idx];
  const ring: Ring = zone.geometry.coordinates[0];
  await mkdir(path.join(ROOT, "data/qloo-cache"), { recursive: true });

  type E = { name: string; location?: { lat: number; lon: number }; properties?: { address?: string; is_closed?: boolean }; tags?: { id: string }[]; popularity?: number };
  const seen = new Map<string, E>();
  for (let page = 1; page <= 4; page++) {
    const params = new URLSearchParams({
      "filter.type": "urn:entity:place",
      "filter.location": zone.properties.wkt,
      "filter.tags": HAIR_TAGS.join(","),
      "operator.filter.tags": "union",
      take: "50",
      page: String(page),
    });
    const res = await fetch(`${BASE}/v2/insights?${params}`, { headers: { "X-Api-Key": key } });
    const body = await res.text();
    await writeFile(path.join(ROOT, "data/qloo-cache", `diag-z${idx + 1}-p${page}.json`), body);
    const ents: E[] = JSON.parse(body).results?.entities ?? [];
    for (const e of ents) seen.set(e.name + (e.properties?.address ?? ""), e);
    if (ents.length < 50) break;
  }
  const q = [...seen.values()];
  const inside = q.filter((e) => e.location && inRing(e.location.lon, e.location.lat, ring));
  const isHair = (e: E) => (e.tags ?? []).some((t) => HAIR_TAGS.includes(t.id));
  const closed = q.filter((e) => e.properties?.is_closed).length;

  const lic = (JSON.parse(await readFile(path.join(ROOT, "data/raw/lacity/hair_businesses.json"), "utf8")) as {
    business_name?: string; dba_name?: string; street_address?: string; naics: string; location_1?: { latitude?: string; longitude?: string };
  }[]).filter((l) => ["812111", "812112"].includes(l.naics) && Number(l.location_1?.latitude) && inRing(Number(l.location_1!.longitude), Number(l.location_1!.latitude), ring));

  console.log(`Zone ${idx + 1} (${zone.properties.zoneId})`);
  console.log(`Qloo hair places returned: ${q.length}; inside the zone outline: ${inside.length}; tagged barber/hair/beauty: ${q.filter(isHair).length}; marked closed: ${closed}`);
  console.log(`Licensed barbers and salons inside the zone: ${lic.length}`);
  console.log("\nQloo (first 25, inside zone):");
  for (const e of inside.slice(0, 25)) console.log(`  ${e.name.slice(0, 34).padEnd(34)} ${(e.properties?.address ?? "").slice(0, 42)}`);
  console.log("\nLicences (first 25):");
  for (const l of lic.slice(0, 25)) console.log(`  ${(l.dba_name || l.business_name || "").slice(0, 34).padEnd(34)} ${l.street_address ?? ""}`);

  // Address-only overlap: same house number and same first street word.
  const addrKey = (a: string) => {
    const m = /^\s*(\d+)\s+(?:[NSEW]\.?\s+)?([A-Za-z0-9]+)/.exec(a);
    return m ? `${m[1]} ${m[2].toLowerCase()}` : "";
  };
  const licAddr = new Set(lic.map((l) => addrKey(l.street_address ?? "")).filter(Boolean));
  const overlap = inside.filter((e) => licAddr.has(addrKey(e.properties?.address ?? "")));
  console.log(`\nSame street address in both sources: ${overlap.length} of ${inside.length} Qloo places`);
  for (const e of overlap.slice(0, 12)) console.log(`  ${e.name.slice(0, 34).padEnd(34)} ${(e.properties?.address ?? "").slice(0, 42)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
