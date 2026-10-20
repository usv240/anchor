import { harnessCall } from "@/lib/qloo/harness";
import { QlooClient, type QlooCache } from "@/lib/qloo/client";
import type { TraceLedger } from "@/lib/trace/ledger";
import { metres, normName } from "@/lib/domain/geo";
import type { TrustSignal } from "@/lib/domain/scoring";
import { AGE_GROUPS, DAYS, type AgeGroup, type Day } from "@/lib/domain/types";
import type { Venue } from "@/lib/domain/venues";

/**
 * The trust layer: which places a group of people loves inside a zone.
 *
 * Finding from the day-1 test (Oct 19, docs/kill-tests.md): Qloo does not
 * cover small neighbourhood barbershops and salons in South Los Angeles, but it
 * does cover the places residents love most (restaurants, bakeries, markets,
 * parks), and its affinity scores differ strongly by audience. So:
 *
 *  - Barbershops and salons (the venue type the NEJM trial tested) come from
 *    city business licences. Qloo cannot score them, and we never pretend it can.
 *  - "Loved places" come from Qloo: place insights inside the zone polygon with
 *    age and gender signals. Anchor re-ranks them by the audience's affinity
 *    (Qloo returns them by popularity), keeps open, suitable places inside real
 *    high-need neighbourhoods, and matches them to licences where it can.
 *
 * OfflineTrust is used until a Qloo key is configured. It returns nothing and
 * the plan says so.
 */

export type ZoneRef = { zoneId: string; wkt: string };
export type Audience = { ageGroups: AgeGroup[]; gender: "male" | "female" | "any" };

export type LovedPlace = Venue & {
  trust: TrustSignal;
  qlooCategories: string[];
  qlooTags: string[];
  servesAlcohol: boolean;
  openDays: Day[] | null;
  licensedMatch: boolean;
};

export type ZoneTrust = { loved: LovedPlace[]; traceIds: string[]; returned: number; removed: { name: string; category: string; reason: string }[] };

export type Flavour = { tags: { name: string; kind: string }[]; traceIds: string[]; via?: "rest" | "harness" };

export interface TrustProvider {
  readonly mode: "qloo" | "offline";
  forZone(zone: ZoneRef, licensed: Venue[], audience: Audience): Promise<ZoneTrust>;
  /** Taste analysis: what this group is into around a zone (talking points). */
  /** lovedIds: Qloo ids of the plan's loved places in this zone, for the harness backup. */
  localFlavour?(zone: ZoneRef, audience: Audience, lovedIds?: string[]): Promise<Flavour>;
}

export class OfflineTrust implements TrustProvider {
  readonly mode = "offline" as const;
  async forZone(): Promise<ZoneTrust> {
    return { loved: [], traceIds: [], returned: 0, removed: [] };
  }
}

/* ---------- reading Qloo place entities (shape confirmed Oct 19) ---------- */

type QlooTag = { id: string; name: string; type: string };
type HoursSlot = { opens?: string; closes?: string; closed?: boolean };
export type QlooPlaceEntity = {
  entity_id: string;
  name: string;
  popularity?: number;
  location?: { lat?: number; lon?: number };
  properties?: { address?: string; is_closed?: boolean; hours?: Partial<Record<Day, HoursSlot[]>>; neighborhood?: string };
  tags?: QlooTag[];
  query?: { affinity?: number };
};
type QlooInsights = { results?: { entities?: QlooPlaceEntity[] } };

/** Categories that are never outreach venues. Matched on Qloo category names. */
const UNSUITABLE_CATEGORY = /\b(bar|pub|night ?club|liquor|cocktail|brewery|brewpub|winery|wine bar|beer|lounge|hookah|smoke|tobacco|vape|cannabis|dispensary|casino|adult)\b/i;
const UNSUITABLE_EXCEPT = /\b(bar-?b-?q|barbe?cue|juice bar|salad bar|snack bar|coffee bar|espresso bar)\b/i;
/** Grocery stores often also carry a "liquor store" category; they are everyday community places, not alcohol venues. */
const GROCERY = /\b(grocery|supermarket|market|food store|warehouse store|discount store|department store|pharmacy|drugstore)\b/i;
/** National chains get a lower evidence weight than local favourites (same heuristic as the licence data). */
export const CHAIN =
  /(#\s?\d{2,}|\b(mcdonald'?s|subway|starbucks|jack in the box|burger king|taco bell|kfc|wendy'?s|domino'?s|pizza hut|little caesars|el pollo loco|carl'?s jr|panda express|chipotle|popeyes|wingstop|7-?eleven|dunkin|ihop|denny'?s|del taco|chick-?fil-?a|in-?n-?out|jollibee|pollo campero|church'?s|raising cane'?s|krispy kreme|the habit|jamba|walgreens|cvs|rite aid|target|walmart|costco|ralphs|vons|food 4 less|smart (and|&) final|superior grocers|northgate|el super|aldi|sprouts|trader joe'?s|whole foods)\b)/i;

/**
 * Community-anchor tags Anchor may use. This is an allowlist: no other Qloo
 * tag (in particular no identity tag outside this list) ever affects a plan.
 */
export const ANCHOR_TAGS = new Set(["Locals", "Regulars", "Families", "Social community", "Neighborhood corner", "Neighborhood storefront", "Welcoming", "Homey", "Good for kids"]);

const ALCOHOL_OFFERINGS = new Set(["Alcohol", "Beer", "Wine", "Cocktails", "Hard liquor", "Happy hour drinks"]);

export function readPlace(e: QlooPlaceEntity) {
  const tags = e.tags ?? [];
  const categories = tags.filter((t) => t.type === "urn:tag:category:place").map((t) => t.name);
  const anchor = [...new Set(tags.map((t) => t.name).filter((n) => ANCHOR_TAGS.has(n)))];
  const servesAlcohol = tags.some((t) => t.type === "urn:tag:offerings:place" && ALCOHOL_OFFERINGS.has(t.name));
  const hours = e.properties?.hours;
  const openDays = hours ? DAYS.filter((d) => (hours[d] ?? []).some((s) => !s.closed)) : null;
  const alcoholCategory = categories.find((c) => UNSUITABLE_CATEGORY.test(c) && !UNSUITABLE_EXCEPT.test(c));
  const unsuitable = alcoholCategory && !categories.some((c) => GROCERY.test(c)) ? alcoholCategory : undefined;
  return {
    lat: e.location?.lat,
    lon: e.location?.lon,
    address: (e.properties?.address ?? "").trim(),
    closed: e.properties?.is_closed === true,
    categories,
    anchor,
    servesAlcohol,
    openDays,
    unsuitable: unsuitable ? `Qloo category: ${unsuitable}` : null,
    affinity: typeof e.query?.affinity === "number" ? e.query.affinity : null,
    popularity: typeof e.popularity === "number" ? e.popularity : 0.5,
  };
}

/**
 * Qloo addresses have no comma between street and city:
 * "7717 S Western Ave Los Angeles, CA 90047". Split on the last street suffix
 * (plus an optional unit), then city, state and zip.
 */
const ADDRESS = new RegExp(
  "^(.*\\b(?:Blvd|Boulevard|Ave|Avenue|St|Street|Rd|Road|Dr|Drive|Way|Pl|Place|Ln|Lane|Ct|Court|Hwy|Highway|Pkwy|Parkway|Ter|Terrace|Cir|Circle|Sq|Square|Plaza|Mall)\\.?" +
    "(?:\\s+(?:#|Ste|Suite|Unit|Apt|Bldg|Building|Space|Spc)\\.?\\s*[\\w-]+)?)\\s+([A-Za-z][A-Za-z .'-]*?),\\s*CA\\b\\s*(\\d{5})?",
);
/** Cities and communities in and around Los Angeles County, longest first so "East Los Angeles" wins over "Los Angeles". */
const KNOWN_CITIES = [
  "East Los Angeles", "Los Angeles", "Inglewood", "Compton", "Lynwood", "South Gate", "Huntington Park", "Gardena", "Hawthorne", "Culver City",
  "Bell Gardens", "Bell", "Maywood", "Cudahy", "Paramount", "Downey", "Long Beach", "Carson", "Lawndale", "Lennox", "Willowbrook", "Florence-Graham",
  "Westmont", "Walnut Park", "Vernon", "Commerce", "Pasadena", "Glendale", "Burbank", "Santa Monica", "West Hollywood", "Beverly Hills",
  "North Hollywood", "Van Nuys", "Panorama City", "Pacoima", "San Fernando", "Sylmar", "Reseda", "Canoga Park", "Wilmington", "San Pedro",
  "Harbor City", "Torrance", "El Monte", "Pomona", "Lancaster", "Palmdale", "Alhambra", "Monterey Park", "Whittier", "Norwalk", "Bellflower",
  "Lakewood", "Cerritos", "Montebello", "Pico Rivera", "Rosemead", "Baldwin Park", "West Covina", "Covina", "Azusa", "Arcadia", "Monrovia",
  "Sherman Oaks", "Encino", "Studio City", "Tarzana", "Woodland Hills", "Northridge", "Granada Hills", "Chatsworth", "Sun Valley", "Sunland",
  "Tujunga", "Eagle Rock", "Highland Park", "Hollywood", "Venice", "Marina del Rey", "Playa Vista", "Westchester", "El Segundo", "Signal Hill",
].sort((a, b) => b.length - a.length);
const KNOWN_CITY = new RegExp(`^(.*?)\\s+(${KNOWN_CITIES.join("|")}),\\s*CA\\b\\s*(\\d{5})?`, "i");

export function splitAddress(a: string): { street: string; city: string; zip: string } {
  const known = KNOWN_CITY.exec(a.trim());
  if (known) return { street: known[1].trim(), city: known[2].trim(), zip: known[3] ?? "" };
  const m = ADDRESS.exec(a.trim());
  if (m) return { street: m[1].trim(), city: m[2].trim(), zip: m[3] ?? "" };
  const comma = /^(.*?),\s*CA\b\s*(\d{5})?/.exec(a.trim());
  return comma ? { street: comma[1].trim(), city: "", zip: comma[2] ?? "" } : { street: a.trim(), city: "", zip: "" };
}

export function qlooAgeParam(groups: AgeGroup[]): string {
  return [...new Set(groups.flatMap((g) => AGE_GROUPS[g].qloo))].join(",");
}

const houseNumber = (s: string) => /^\s*(\d+)/.exec(s)?.[1] ?? "";

export class QlooTrust implements TrustProvider {
  readonly mode = "qloo" as const;
  private readonly client: QlooClient;
  private readonly apiKey: string;

  constructor(opts: { apiKey: string; byok?: boolean; ledger: TraceLedger; cache?: QlooCache; budget?: number; fetchImpl?: typeof fetch; minIntervalMs?: number }) {
    this.apiKey = opts.apiKey;
    this.client = new QlooClient({
      apiKey: opts.apiKey,
      byok: opts.byok,
      ledger: opts.ledger,
      cache: opts.cache,
      budget: opts.budget ?? 80,
      fetchImpl: opts.fetchImpl,
      minIntervalMs: opts.minIntervalMs,
    });
  }

  async forZone(zone: ZoneRef, licensed: Venue[], audience: Audience): Promise<ZoneTrust> {
    const params: Record<string, string | number | boolean> = {
      "filter.type": "urn:entity:place",
      "filter.location": zone.wkt,
      "signal.demographics.age": qlooAgeParam(audience.ageGroups),
      take: 50,
    };
    if (audience.gender !== "any") params["signal.demographics.gender"] = audience.gender;

    const res = await this.client.insights<QlooInsights>(params, (d) => `${d.results?.entities?.length ?? 0} places in ${zone.zoneId}`);
    const entities = res.data.results?.entities ?? [];
    const loved: LovedPlace[] = [];
    const removed: ZoneTrust["removed"] = [];

    for (const e of entities) {
      const p = readPlace(e);
      if (typeof p.lat !== "number" || typeof p.lon !== "number" || !e.name) continue;
      const category = p.categories[0] ?? "Local place";
      if (p.closed) {
        removed.push({ name: e.name, category, reason: "Marked closed by Qloo" });
        continue;
      }
      if (p.unsuitable) {
        removed.push({ name: e.name, category, reason: p.unsuitable });
        continue;
      }
      const at = { lat: p.lat, lon: p.lon };
      const addr = splitAddress(p.address);
      const match = licensed.find(
        (v) =>
          metres(v, at) < 150 &&
          ((normName(v.name) !== "" && normName(v.name) === normName(e.name)) || (houseNumber(v.address) !== "" && houseNumber(v.address) === houseNumber(addr.street))),
      );
      loved.push({
        id: `qloo-${e.entity_id}`,
        name: e.name,
        category,
        naics: match?.naics ?? "",
        evidence: CHAIN.test(e.name) ? 0.6 : lovedEvidence(category),
        suitable: true,
        unsuitableReason: null,
        address: addr.street,
        city: addr.city,
        insideCityOfLA: match?.insideCityOfLA ?? false,
        zip: addr.zip,
        lat: p.lat,
        lon: p.lon,
        zoneId: zone.zoneId,
        since: match?.since ?? null,
        yearsInBusiness: match?.yearsInBusiness ?? null,
        trust: {
          affinity: p.affinity ?? 0.5,
          popularity: p.popularity,
          community: Math.min(1, p.anchor.length / 3),
          explanation: p.anchor.slice(0, 3).join(", "),
        },
        qlooCategories: p.categories.slice(0, 3),
        qlooTags: p.anchor,
        servesAlcohol: p.servesAlcohol,
        openDays: p.openDays,
        licensedMatch: Boolean(match),
      });
    }
    return { loved, traceIds: res.traceId ? [res.traceId] : [], returned: entities.length, removed };
  }

  async localFlavour(zone: ZoneRef, audience: Audience, lovedIds: string[] = []): Promise<Flavour> {
    const params: Record<string, string | number> = {
      "filter.type": "urn:tag",
      "signal.location": zone.wkt,
      "signal.demographics.age": qlooAgeParam(audience.ageGroups),
      take: 25,
    };
    if (audience.gender !== "any") params["signal.demographics.gender"] = audience.gender;
    type T = { results?: { tags?: RawTag[] } };
    try {
      const res = await this.client.insights<T>(params, (d) => `${d.results?.tags?.length ?? 0} taste tags around ${zone.zoneId}`);
      return { tags: cleanTags(res.data.results?.tags ?? []), traceIds: res.traceId ? [res.traceId] : [], via: "rest" };
    } catch (err) {
      // Backup: Qloo's official harness describes what the group's loved places in this zone have in common.
      if (lovedIds.length === 0) throw err;
      const h = await harnessCall(this.apiKey, "qloo_entity_tags", { entities: lovedIds.slice(0, 10), entity_type: "place", limit: 20 }).catch(() => null);
      if (h?.status !== "ok" || !h.results?.length) throw err;
      return { tags: cleanTags(h.results as RawTag[]), traceIds: [], via: "harness" };
    }
  }
}

type RawTag = { name: string; subtype?: string; type?: string; tag_id?: string };
const KIND: Record<string, string> = { media: "Shows and media", place: "Places", brand: "Shopping", specialty_dish: "Food", cuisine: "Food", music: "Music" };

/** Plain kinds, no sensitive or unhelpful topics, no duplicates, at most 12. */
export function cleanTags(raw: RawTag[]): Flavour["tags"] {
  const seen = new Set<string>();
  return raw
    .map((t) => {
      const parts = (t.subtype ?? t.tag_id ?? t.type ?? "").split(":");
      const key = parts[2] === "genre" ? parts[3] ?? "" : parts[2] ?? "";
      return { name: t.name.replace(/&amp;/g, "&"), kind: KIND[key] ?? "Interests" };
    })
    .filter((t) => !/politic|religio|ethnic|race|govern|military|tourist|immigra|activis/i.test(t.name))
    .filter((t) => (seen.has(t.name.toLowerCase()) ? false : (seen.add(t.name.toLowerCase()), true)))
    .slice(0, 12);
}

/** Everyday community places score like licensed ones of the same kind; parks and markets are good public spaces. */
function lovedEvidence(category: string): number {
  if (/barber|hair salon|beauty salon/i.test(category)) return 1;
  if (/restaurant|bakery|cafe|coffee|market|grocery|supermarket|park|laundr|gym|fitness|library|community|church|recreation|food/i.test(category)) return 0.8;
  return 0.6;
}

export function makeTrustProvider(opts: { qlooKey?: string; byok?: boolean; ledger: TraceLedger; cache?: QlooCache }): TrustProvider {
  return opts.qlooKey ? new QlooTrust({ apiKey: opts.qlooKey, byok: opts.byok, ledger: opts.ledger, cache: opts.cache }) : new OfflineTrust();
}
