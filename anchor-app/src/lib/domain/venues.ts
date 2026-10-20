import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Licensed local businesses inside high-need zones, built by
 * eval/pipeline/build_venues.py from City of Los Angeles business licences
 * (CC0). Server-only. These are real businesses; they are not Qloo data.
 */

export type Venue = {
  id: string;
  name: string;
  category: string;
  naics: string;
  evidence: number;
  suitable: boolean;
  unsuitableReason: string | null;
  address: string;
  city: string;
  insideCityOfLA: boolean;
  zip: string;
  lat: number;
  lon: number;
  zoneId: string;
  since: string | null;
  yearsInBusiness: number | null;
};

type VenueFile = { source: string; coverage: string; excludedSoleTraders: number; venues: Venue[] };

const cache = new Map<string, Promise<VenueFile>>();

export function loadVenueFile(county = "06037"): Promise<VenueFile> {
  let hit = cache.get(county);
  if (!hit) {
    const file = path.join(process.cwd(), "data", "derived", county, "venues.json");
    hit = readFile(file, "utf8").then((t) => JSON.parse(t) as VenueFile);
    cache.set(county, hit);
  }
  return hit;
}

export async function venuesByZone(county = "06037"): Promise<Map<string, Venue[]>> {
  const { venues } = await loadVenueFile(county);
  const byZone = new Map<string, Venue[]>();
  for (const v of venues) {
    const list = byZone.get(v.zoneId);
    if (list) list.push(v);
    else byZone.set(v.zoneId, [v]);
  }
  return byZone;
}
