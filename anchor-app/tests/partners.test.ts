import { describe, expect, it } from "vitest";
import { EXAMPLE_PARTNER_CSV, parsePartnerCsv } from "@/lib/domain/partners";
import { runBasicPlanner } from "@/lib/agent/basic";
import { OfflineTrust } from "@/lib/domain/trust";
import { PlanRequest } from "@/lib/domain/types";

describe("partner file (bring your own data)", () => {
  it("reads the example file, with quoted names", () => {
    const r = parsePartnerCsv(EXAMPLE_PARTNER_CSV + '\n"Joe\'s Cuts, Inc",33.95,-118.29,Barbershop');
    expect(r.error).toBeNull();
    expect(r.partners).toHaveLength(4);
    expect(r.partners[3]).toEqual({ name: "Joe's Cuts, Inc", lat: 33.95, lon: -118.29, category: "Barbershop" });
  });

  it("refuses any file with a column about people", () => {
    for (const col of ["Patient", "DOB", "phone", "First Name", "diagnosis"]) {
      const r = parsePartnerCsv(`name,latitude,longitude,${col}\nA,33.9,-118.3,x`);
      expect(r.partners).toHaveLength(0);
      expect(r.error).toMatch(/about people/);
    }
  });

  it("needs coordinates and skips bad rows", () => {
    expect(parsePartnerCsv("name,address\nA,1 Main St").error).toMatch(/latitude and longitude/);
    const r = parsePartnerCsv("name,lat,lng\nA,33.9,-118.3\nB,not,a number\n,33.9,-118.3");
    expect(r.partners.map((p) => p.name)).toEqual(["A"]);
    expect(r.skipped).toBe(2);
  });
});

describe("partners in a plan", () => {
  it("checks each partner against need and puts high-need ones first", async () => {
    const { plan } = await runBasicPlanner(
      PlanRequest.parse({
        audience: { ageGroups: ["35_to_54"], gender: "male" },
        partners: [
          { name: "South LA partner", lat: 33.952, lon: -118.298, category: "Barbershop" }, // zone 1, high need
          { name: "Westwood partner", lat: 34.063, lon: -118.445 }, // low need
          { name: "Corner Liquor", lat: 33.9525, lon: -118.2985 }, // high need, but never an outreach venue
        ],
      }),
      { trust: new OfflineTrust() },
    );
    expect(plan.partnerCheck?.uploaded).toBe(3);
    expect(plan.partnerCheck?.inHighNeed).toBe(2);
    expect(plan.partnerCheck?.places[0].needPct).toBeGreaterThan(0.8);
    expect(plan.venues[0]).toMatchObject({ name: "South LA partner", group: "partner", verification: { status: "partner" } });
    expect(plan.venues.some((v) => v.name === "Westwood partner" || v.name === "Corner Liquor")).toBe(false);
    expect(plan.removed.some((r) => r.name === "Corner Liquor")).toBe(true);
  });
});

describe("owner invitation", () => {
  it("uses the plan's own visit time and need estimate, in plain style", async () => {
    const { inviteText } = await import("@/components/app/OwnerInvite");
    const { plan } = await runBasicPlanner(PlanRequest.parse({ audience: { ageGroups: ["55_plus"], gender: "female" } }), { trust: new OfflineTrust() });
    const v = plan.venues[0];
    const text = inviteText(plan, v, "Test Health Team", "women aged 55 and older");
    const visit = plan.visits.find((x) => x.venueId === v.id)!;
    expect(text).toContain(`Hello ${v.name} team`);
    expect(text).toContain("We are Test Health Team");
    expect(text).toContain(`${visit.start} to ${visit.end}`);
    expect(text).toMatch(/about [\d,]+ adults in this neighbourhood/);
    expect(text).not.toMatch(/[–—]/); // no en or em dashes
    expect(text).not.toMatch(/\bcure|diagnos|medicine you|dose\b/i); // no health claims
  });
});
