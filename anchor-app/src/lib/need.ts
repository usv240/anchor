import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Server-only loader for the precomputed need layer produced by
 * eval/pipeline/build_need.py (CDC PLACES + Census tract shapes).
 */

export type Ring = [number, number][];
export type PolygonGeom = { type: "Polygon"; coordinates: Ring[] };

export type Zone = {
  zoneId: string;
  need: number;
  estUntreatedAdults: number;
  adults: number;
  tracts: string[];
  centroid: [number, number];
  areaKm2: number;
  wkt: string;
  geometry: PolygonGeom;
};

export type NeedSummary = {
  countyFips: string;
  countyName: string;
  source: string;
  method: string;
  topShare: number;
  tracts: number;
  adults: number;
  estUntreatedAdults: number;
  zones: number;
  zoneTracts: number;
  zoneEstUntreatedAdults: number;
  maxZoneWktBytes: number;
};

export type Focus = {
  bbox: [number, number, number, number];
  land: unknown;
  pins: { rank: number; zoneId: string; centroid: [number, number]; estUntreatedAdults: number }[];
  tracts: {
    features: { geometry: unknown; properties: { high: boolean; needPct: number; zoneRank: number | null } }[];
  };
};

const dataDir = (county: string) => path.join(process.cwd(), "public", "data", "need", county);

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export async function loadNeed(county = "06037") {
  // Static, pipeline-built data: cache it so pages can be prerendered.
  "use cache";
  const [summary, zonesFc, focus] = await Promise.all([
    readJson<NeedSummary>(path.join(dataDir(county), "summary.json")),
    readJson<{ features: { geometry: PolygonGeom; properties: Omit<Zone, "geometry"> }[] }>(
      path.join(dataDir(county), "zones.geojson"),
    ),
    readJson<Focus>(path.join(dataDir(county), "focus.json")),
  ]);
  const zones: Zone[] = zonesFc.features.map((f) => ({ ...f.properties, geometry: f.geometry }));
  return { summary, zones, focus };
}

type Ring2 = number[][];
type TractGeom = { type: "Polygon"; coordinates: Ring2[] } | { type: "MultiPolygon"; coordinates: Ring2[][] };

function inRing(lon: number, lat: number, ring: Ring2): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const zoneTractCache = new Map<string, Promise<Map<string, TractGeom[]>>>();
function loadZoneTracts(county: string): Promise<Map<string, TractGeom[]>> {
  let hit = zoneTractCache.get(county);
  if (!hit) {
    hit = readJson<{ features: { properties: { zoneId: string }; geometry: TractGeom }[] }>(
      path.join(dataDir(county), "zone_tracts.geojson"),
    ).then((fc) => {
      const m = new Map<string, TractGeom[]>();
      for (const f of fc.features) m.set(f.properties.zoneId, [...(m.get(f.properties.zoneId) ?? []), f.geometry]);
      return m;
    });
    zoneTractCache.set(county, hit);
  }
  return hit;
}

/**
 * True if a point lies inside one of the zone's actual high-need census tracts
 * (not just inside the zone's convex outline). Keeps Qloo-only places to the
 * same rule as licensed ones.
 */
export async function inHighNeedTract(county: string, zoneId: string, p: { lat: number; lon: number }): Promise<boolean> {
  const tracts = await loadZoneTracts(county);
  return (tracts.get(zoneId) ?? []).some((g) => {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return polys.some((rings) => inRing(p.lon, p.lat, rings[0]));
  });
}
