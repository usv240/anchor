import { describe, expect, it } from "vitest";
import { runBasicPlanner } from "@/lib/agent/basic";
import { OfflineTrust } from "@/lib/domain/trust";
import { PlanRequest, type PlanEvent } from "@/lib/domain/types";
import { toCsv, toGeoJson, toIcs } from "@/lib/domain/exports";
import { checkTargeting } from "@/lib/domain/policy";
import { metres } from "@/lib/domain/geo";
import { verifyChain } from "@/lib/trace/ledger";

const NOW = () => new Date("2026-10-17T12:00:00Z");

async function plan(overrides: Partial<PlanRequest> = {}) {
  const request = PlanRequest.parse(overrides);
  const events: PlanEvent[] = [];
  const out = await runBasicPlanner(request, { trust: new OfflineTrust(), emit: (e) => events.push(e), now: NOW });
  return { ...out, events };
}

describe("basic planner on real Los Angeles data (offline mode)", () => {
  it("produces a valid plan with the default request", async () => {
    const { plan: p } = await plan();
    expect(p.venues.length).toBe(12);
    expect(p.zones.length).toBe(8);
    expect(p.mode).toMatchObject({ trust: "offline", planner: "basic" });
    expect(p.summary).toMatch(/places in 8 high-need zones/);
  });

  it("never includes unsuitable venues (negative control)", async () => {
    const { plan: p } = await plan({ options: { zones: 30, maxVenues: 40, preferredDays: ["saturday"], excludeCategories: [] } });
    expect(p.venues.every((v) => !/^(Bar|Liquor store)$/.test(v.category))).toBe(true);
    expect(p.counts.unsuitableRemoved).toBeGreaterThan(0);
  });

  it("follows the diversity rules", async () => {
    const { plan: p } = await plan({ options: { zones: 20, maxVenues: 30, preferredDays: ["saturday"], excludeCategories: [] } });
    const perZone = new Map<string, number>();
    for (const v of p.venues) perZone.set(v.zoneId, (perZone.get(v.zoneId) ?? 0) + 1);
    expect(Math.max(...perZone.values())).toBeLessThanOrEqual(3);
    for (const [cat, n] of Object.entries(p.counts.categories)) expect(n, cat).toBeLessThanOrEqual(15);
    for (let i = 0; i < p.venues.length; i++)
      for (let j = i + 1; j < p.venues.length; j++) expect(metres(p.venues[i], p.venues[j])).toBeGreaterThanOrEqual(250);
  });

  it("cites evidence that exists, and the trace verifies", async () => {
    const { plan: p, builder } = await plan();
    const records = builder.ledger.toJSON();
    const ids = new Set(records.map((r) => r.id));
    for (const v of p.venues) for (const c of v.citations) expect(ids.has(c)).toBe(true);
    expect(verifyChain(records)).toEqual({ valid: true });
    expect(p.trace.head).toBe(builder.ledger.head);
  });

  it("is deterministic for the same request", async () => {
    const a = (await plan()).plan.venues.map((v) => v.id);
    const b = (await plan()).plan.venues.map((v) => v.id);
    expect(a).toEqual(b);
  });

  it("streams every step to done or skipped", async () => {
    const { events } = await plan();
    const last = new Map<string, string>();
    for (const e of events) if (e.type === "step") last.set(e.id, e.status);
    expect([...last.keys()]).toEqual(["policy", "need", "trust", "check", "rank", "schedule"]);
    expect(last.get("trust")).toBe("skipped"); // no Qloo key in tests
    expect([...last.values()].filter((s) => s !== "skipped").every((s) => s === "done")).toBe(true);
  });

  it("states its limits, including offline mode", async () => {
    const { plan: p } = await plan();
    expect(p.limits.join(" ")).toMatch(/model-based estimates/);
    expect(p.limits.join(" ")).toMatch(/Without Qloo/);
  });
});

describe("targeting policy", () => {
  it.each([
    "find places Black men go in South LA",
    "target Latino families",
    "where do immigrants hang out",
    "reach the Korean community",
    "Muslim neighbourhoods",
  ])("reframes: %s", (prompt) => {
    expect(checkTargeting(prompt).reframed).toBe(true);
  });

  it.each(["men aged 35 to 54 in Koreatown", "older women near Crenshaw", "Saturday events at barbershops", "Blackwelder Street area"])(
    "does not reframe: %s",
    (prompt) => {
      expect(checkTargeting(prompt).reframed).toBe(false);
    },
  );

  it("records a reframe in the plan", async () => {
    const { plan: p } = await plan({ prompt: "barbershops Black men like" });
    expect(p.policy.reframed).toBe(true);
    expect(p.policy.message).toMatch(/not by race/);
  });
});

describe("exports", () => {
  it("writes CSV, GeoJSON and ICS that match the plan", async () => {
    const { plan: p } = await plan();
    const csv = toCsv(p);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(p.venues.length + 1);
    const geo = JSON.parse(toGeoJson(p));
    expect(geo.features).toHaveLength(p.venues.length);
    const ics = toIcs(p, NOW());
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(p.visits.length);
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });

  it("schedules visits from next Monday onwards", async () => {
    const { plan: p } = await plan();
    expect(p.visits[0].date >= "2026-10-19").toBe(true);
    expect(new Set(p.visits.map((v) => v.day))).toEqual(new Set(["friday", "saturday"]));
  });

  it("neutralises spreadsheet formula injection in CSV", () => {
    const fake = {
      venues: [{ id: "x", name: "=HYPERLINK(1)", scores: {}, verification: {} }],
      visits: [],
    } as unknown as Parameters<typeof toCsv>[0];
    expect(toCsv(fake)).toContain(`"'=HYPERLINK(1)"`);
  });
});
