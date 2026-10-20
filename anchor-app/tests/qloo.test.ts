import { describe, expect, it, vi } from "vitest";
import { guardInsightParams, QlooParamError } from "@/lib/qloo/params";
import { MemoryCache, QlooBudgetError, QlooClient, QlooError } from "@/lib/qloo/client";
import { TraceLedger, verifyChain } from "@/lib/trace/ledger";

// Synthetic response with an obviously fake shape. Real Qloo responses are never committed.
const FAKE_BODY = JSON.stringify({ success: true, results: { entities: [{ entity_id: "fake-1", name: "Test Place" }] } });

const placeParams = {
  "filter.type": "urn:entity:place",
  "filter.location": "POLYGON((-118.3 33.9, -118.2 33.9, -118.2 34.0, -118.3 33.9))",
  "signal.demographics.age": "35_to_44,45_to_54",
  "signal.demographics.gender": "male",
  "feature.explainability": true,
  take: 50,
};

function okFetch(body = FAKE_BODY) {
  return vi.fn(async () => new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
}

describe("parameter guard", () => {
  it("accepts a valid place query", () => {
    expect(() => guardInsightParams(placeParams)).not.toThrow();
  });

  it("rejects a parameter Qloo would silently ignore for this type", () => {
    expect(() => guardInsightParams({ ...placeParams, "filter.publication_year.min": 2000 })).toThrow(/silently ignore/);
  });

  it("rejects place-only filters on artist queries", () => {
    expect(() =>
      guardInsightParams({ "filter.type": "urn:entity:artist", "signal.location.query": "Los Angeles", "filter.hours": "saturday" }),
    ).toThrow(QlooParamError);
  });

  it("rejects community audiences by policy", () => {
    expect(() =>
      guardInsightParams({ ...placeParams, "signal.demographics.audiences": "urn:audience:communities:example" }),
    ).toThrow(/targeting policy/);
  });

  it("rejects take above 50", () => {
    expect(() => guardInsightParams({ ...placeParams, take: 51 })).toThrow(/take/);
  });

  it("requires a signal or a location", () => {
    expect(() => guardInsightParams({ "filter.type": "urn:entity:place" })).toThrow(/signal/);
  });
});

describe("Qloo client", () => {
  it("sends the key in X-Api-Key to the hackathon host, never in the URL", async () => {
    const fetchImpl = okFetch();
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "test-key", fetchImpl });
    await client.insights(placeParams);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith("https://hackathon.api.qloo.com/v2/insights?")).toBe(true);
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("test-key");
    expect(init.method).toBe("GET");
  });

  it("does not call Qloo at all when the guard fails", async () => {
    const fetchImpl = okFetch();
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl });
    await expect(client.insights({ ...placeParams, "filter.release_year.min": 1990 })).rejects.toThrow(QlooParamError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("serves repeat requests from cache without spending budget", async () => {
    const fetchImpl = okFetch();
    const cache = new MemoryCache();
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl, cache, budget: 1 });
    const a = await client.insights(placeParams);
    const b = await client.insights({ ...placeParams }); // same request, different object
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps BYOK cache entries separate from the hosted key", async () => {
    const cache = new MemoryCache();
    await new QlooClient({ minIntervalMs: 0, apiKey: "hosted", fetchImpl: okFetch(), cache }).insights(placeParams);
    const byokFetch = okFetch();
    const byok = new QlooClient({ minIntervalMs: 0, apiKey: "theirs", byok: true, fetchImpl: byokFetch, cache });
    const r = await byok.insights(placeParams);
    expect(r.cached).toBe(false);
    expect(byokFetch).toHaveBeenCalledTimes(1);
  });

  it("stops at the call budget with a clear error", async () => {
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl: okFetch(), budget: 1 });
    await client.insights(placeParams);
    await expect(client.insights({ ...placeParams, take: 10 })).rejects.toThrow(QlooBudgetError);
  });

  it("retries on 429 and 5xx, then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(new Response("oops", { status: 503 }))
      .mockResolvedValueOnce(new Response(FAKE_BODY, { status: 200 }));
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl, sleep: async () => {} });
    const r = await client.insights(placeParams);
    expect(r.cached).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("explains a 401 instead of failing silently", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 401 }));
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl, sleep: async () => {} });
    await expect(client.insights(placeParams)).rejects.toThrow(/hackathon\.api\.qloo\.com/);
  });

  it("refuses community audiences before sending", async () => {
    const fetchImpl = okFetch();
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl });
    await expect(client.audiences("urn:audience:communities")).rejects.toThrow(QlooError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("trace ledger", () => {
  it("records each call without the key, and the chain verifies", async () => {
    const ledger = new TraceLedger(() => new Date("2026-10-16T00:00:00Z"));
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "secret-key", fetchImpl: okFetch(), ledger });
    const r1 = await client.insights(placeParams, () => "1 place");
    await client.insights(placeParams); // cache hit, also traced
    const records = ledger.toJSON();
    expect(records).toHaveLength(2);
    expect(r1.traceId).toBe("tr_0001");
    expect(JSON.stringify(records)).not.toContain("secret-key");
    expect(records[0].summary).toBe("1 place");
    expect(verifyChain(records)).toEqual({ valid: true });
  });

  it("detects tampering", async () => {
    const ledger = new TraceLedger();
    const client = new QlooClient({ minIntervalMs: 0, apiKey: "k", fetchImpl: okFetch(), ledger });
    await client.insights(placeParams);
    await client.insights({ ...placeParams, take: 10 });
    const records = ledger.toJSON();
    records[0].summary = "edited";
    expect(verifyChain(records)).toEqual({ valid: false, brokenAt: "tr_0001" });
  });
});

describe("rate limit throttle", () => {
  it("spaces requests at least 250 ms apart by default", async () => {
    const fetchImpl = vi.fn(async () => new Response(FAKE_BODY, { status: 200 }));
    const waits: number[] = [];
    const client = new QlooClient({ apiKey: "k", fetchImpl, sleep: async (ms) => void waits.push(ms) });
    await client.insights({ ...placeParams, take: 1 });
    await client.insights({ ...placeParams, take: 2 });
    await client.insights({ ...placeParams, take: 3 });
    expect(waits.filter((w) => w > 0).length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...waits)).toBeGreaterThan(200);
  });
});
