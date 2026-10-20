import { describe, expect, it, vi } from "vitest";
import { runBasicPlanner } from "@/lib/agent/basic";
import { QlooTrust, readPlace, splitAddress, type QlooPlaceEntity } from "@/lib/domain/trust";
import { PlanRequest } from "@/lib/domain/types";
import { loadNeed } from "@/lib/need";
import { TraceLedger } from "@/lib/trace/ledger";

/**
 * Synthetic responses shaped like Qloo's place insights (shape confirmed Oct 19).
 * Names and ids are invented; real Qloo responses are never committed.
 */
const tag = (type: string, name: string) => ({ id: `urn:tag:${type}:test:${name.toLowerCase().replace(/\W+/g, "_")}`, name, type: `urn:tag:${type}` });

function entity(i: number, lat: number, lon: number, o: Partial<{ name: string; categories: string[]; affinity: number; closed: boolean; tags: string[]; alcohol: boolean; address: string }> = {}): QlooPlaceEntity {
  return {
    entity_id: `TEST-${i}`,
    name: o.name ?? `Test Place ${i}`,
    popularity: 0.9 - i * 0.01,
    location: { lat, lon },
    properties: {
      address: o.address ?? `${100 + i} Test Ave Los Angeles, CA 90047`,
      is_closed: o.closed ?? false,
      hours: { saturday: [{ opens: "T09:00:00", closes: "T17:00:00", closed: false }] },
    },
    tags: [
      ...(o.categories ?? ["Test restaurant"]).map((c) => ({ ...tag("category", c), type: "urn:tag:category:place" })),
      ...(o.tags ?? ["Locals", "Regulars"]).map((t) => ({ ...tag("customer_identity", t), type: "urn:tag:customer_identity:qloo" })),
      ...(o.alcohol ? [{ ...tag("offerings", "Beer"), type: "urn:tag:offerings:place" }] : []),
    ],
    query: { affinity: o.affinity ?? 0.8 - i * 0.01 },
  };
}

describe("reading Qloo places", () => {
  it("splits Qloo addresses that have no comma before the city", () => {
    expect(splitAddress("1714 W Century Blvd Los Angeles, CA 90047")).toEqual({ street: "1714 W Century Blvd", city: "Los Angeles", zip: "90047" });
    expect(splitAddress("5223 W Century Blvd Ste 100 Inglewood, CA 90301")).toEqual({ street: "5223 W Century Blvd Ste 100", city: "Inglewood", zip: "90301" });
  });

  it("flags bars and liquor stores, but not grocery stores that also sell alcohol", () => {
    expect(readPlace(entity(1, 0, 0, { categories: ["Bar"] })).unsuitable).toMatch(/Bar/);
    expect(readPlace(entity(2, 0, 0, { categories: ["Liquor store"] })).unsuitable).toMatch(/Liquor/);
    expect(readPlace(entity(3, 0, 0, { categories: ["Grocery store", "Liquor store"] })).unsuitable).toBeNull();
    expect(readPlace(entity(4, 0, 0, { categories: ["Barbecue restaurant"] })).unsuitable).toBeNull();
  });

  it("uses only allowlisted community tags", () => {
    const p = readPlace(entity(5, 0, 0, { tags: ["Locals", "Some identity tag", "Regulars"] }));
    expect(p.anchor).toEqual(["Locals", "Regulars"]);
  });

  it("reads opening days and alcohol offerings", () => {
    const p = readPlace(entity(6, 0, 0, { alcohol: true }));
    expect(p.openDays).toEqual(["saturday"]);
    expect(p.servesAlcohol).toBe(true);
  });
});

describe("planning with Qloo (synthetic responses)", () => {
  async function livePlan(audience: { ageGroups: ("18_to_34" | "35_to_54" | "55_plus")[]; gender: "any" | "male" | "female" }) {
    const { zones } = await loadNeed("06037");
    // Put synthetic places at the centroids of the real high-need zones so they sit inside high-need tracts.
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = new URL(String(url));
      const wkt = u.searchParams.get("filter.location") ?? "";
      const z = zones.find((x) => x.wkt === wkt);
      const [lon, lat] = z ? z.centroid : [-118.3, 33.95];
      const ents = Array.from({ length: 9 }, (_, i) =>
        entity(i, lat + (i - 4) * 0.004, lon + ((i % 3) - 1) * 0.004, {
          name: `Loved ${z?.zoneId ?? "x"} ${i}`,
          categories: i === 0 ? ["Bar"] : ["Test restaurant"],
          closed: i === 1,
          // The audience changes affinity, as with real Qloo data.
          affinity: audience.gender === "female" ? 0.5 + i * 0.05 : 0.95 - i * 0.05,
        }),
      );
      return new Response(JSON.stringify({ success: true, results: { entities: ents } }), { status: 200 });
    });
    const ledger = new TraceLedger();
    const trust = new QlooTrust({ apiKey: "test", ledger, fetchImpl, minIntervalMs: 0 });
    const { plan } = await runBasicPlanner(PlanRequest.parse({ audience }), { trust, ledger, now: () => new Date("2026-10-19T12:00:00Z") });
    return { plan, fetchImpl };
  }

  it("builds a plan with half barbershops and salons, half places the group loves", async () => {
    const { plan } = await livePlan({ ageGroups: ["35_to_54"], gender: "male" });
    expect(plan.mode.trust).toBe("qloo");
    const trial = plan.venues.filter((v) => v.group === "trial");
    const community = plan.venues.filter((v) => v.group === "community");
    expect(trial.length).toBeGreaterThan(0);
    expect(community.length).toBeGreaterThan(0);
    expect(trial.every((v) => ["Barbershop", "Beauty salon"].includes(v.category))).toBe(true);
    expect(community.every((v) => v.qloo && v.scores.trust !== null)).toBe(true);
  });

  it("never includes a bar or a closed place from Qloo, and records why", async () => {
    const { plan } = await livePlan({ ageGroups: ["35_to_54"], gender: "male" });
    expect(plan.venues.some((v) => v.category === "Bar")).toBe(false); // ("Barbershop" also starts with "Bar")
    expect(plan.removed.some((r) => /Qloo category: Bar/.test(r.reason))).toBe(true);
    expect(plan.removed.some((r) => /closed/i.test(r.reason))).toBe(true);
  });

  it("only calls places 'loved' if they are in the group's top third by affinity", async () => {
    const men = (await livePlan({ ageGroups: ["35_to_54"], gender: "male" })).plan.venues.filter((v) => v.group === "community");
    const women = (await livePlan({ ageGroups: ["55_plus"], gender: "female" })).plan.venues.filter((v) => v.group === "community");
    // Synthetic affinity runs in opposite directions for the two audiences, so their loved places differ.
    const overlap = men.filter((m) => women.some((w) => w.id === m.id)).length;
    expect(overlap).toBeLessThan(Math.min(men.length, women.length));
  });

  it("sends audience signals and the zone polygon to Qloo", async () => {
    const { fetchImpl } = await livePlan({ ageGroups: ["55_plus"], gender: "female" });
    const u = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(u.searchParams.get("signal.demographics.age")).toBe("55_and_older");
    expect(u.searchParams.get("signal.demographics.gender")).toBe("female");
    expect(u.searchParams.get("filter.location")).toMatch(/^POLYGON\(\(/);
  });
});

describe("address edge cases", () => {
  it.each([
    ["4380 S Broadway Los Angeles, CA 90037", "4380 S Broadway", "Los Angeles"],
    ["1234 E Whittier Blvd East Los Angeles, CA 90023", "1234 E Whittier Blvd", "East Los Angeles"],
    ["935 W Arbor Vitae St Inglewood, CA 90301", "935 W Arbor Vitae St", "Inglewood"],
  ])("%s", (addr, street, city) => {
    expect(splitAddress(addr)).toMatchObject({ street, city });
  });
});
