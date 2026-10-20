import { describe, expect, it, vi } from "vitest";
import { shape } from "@/lib/domain/fans";
import { cleanTags } from "@/lib/domain/trust";
import { findBooks } from "@/lib/domain/books";
import { QlooClient } from "@/lib/qloo/client";
import { needPercentileAt } from "@/lib/need";

// Invented data shaped like Qloo's responses (Qloo data is never stored in the repo).

describe("fan reach", () => {
  it("finds need for real Los Angeles points and nothing outside the county", async () => {
    const southLA = await needPercentileAt("06037", { lat: 33.952, lon: -118.298 });
    expect(southLA).not.toBeNull();
    expect(southLA!).toBeGreaterThan(0.8);
    expect(await needPercentileAt("06037", { lat: 40.71, lon: -74.0 })).toBeNull();
  });

  it("keeps the strongest areas inside the county and counts high-need ones", async () => {
    const cells = [
      { location: { latitude: 34.06, longitude: -118.44 }, query: { affinity: 0.7 } }, // Westwood
      { location: { latitude: 33.952, longitude: -118.298 }, query: { affinity: 0.99 } }, // South LA
      { location: { latitude: 40.71, longitude: -74.0 }, query: { affinity: 1 } }, // New York: dropped
    ];
    const r = await shape("p1", cells, "06037", "rest");
    expect(r.areas.map((a) => a.affinity)).toEqual([0.99, 0.7]);
    expect(r.highNeedAreas).toBe(1);
  });
});

describe("talking point tags", () => {
  it("drops sensitive topics and duplicates, and names kinds plainly", () => {
    const tags = cleanTags([
      { name: "Soul Food", subtype: "urn:tag:cuisine:qloo" },
      { name: "soul food", subtype: "urn:tag:cuisine:qloo" },
      { name: "Activist", tag_id: "urn:tag:keyword:place" },
      { name: "Gospel", subtype: "urn:tag:genre:music" },
      { name: "Politics", subtype: "urn:tag:genre:media" },
    ]);
    expect(tags).toEqual([
      { name: "Soul Food", kind: "Food" },
      { name: "Gospel", kind: "Music" },
    ]);
  });
});

describe("reading corner reasons", () => {
  it("names an interest only when it clearly led to a book, and reports interests that shaped nothing", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      const body = u.includes("/search")
        ? { results: [{ entity_id: u.includes("Minecraft") ? "AAAA0000-0000-0000-0000-000000000001" : "AAAA0000-0000-0000-0000-000000000002", name: u.includes("Minecraft") ? "Minecraft" : "Bluey", types: ["urn:entity:videogame"] }] }
        : {
            results: {
              entities: [
                {
                  name: "Dragon Book",
                  properties: { title: "Dragon Book", publisher: "Scholastic" },
                  query: { affinity: 0.9, explainability: { "signal.interests.entities": [{ entity_id: "AAAA0000-0000-0000-0000-000000000001", score: 1 }] } },
                },
              ],
            },
          };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const client = new QlooClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch, minIntervalMs: 0 });
    const r = await findBooks(client, ["Minecraft", "Bluey"], 3);
    expect(r.books[0].because).toEqual(["Minecraft"]);
    expect(r.unused).toEqual(["Bluey"]);
    const insightsUrl = String(fetchImpl.mock.calls.at(-1)![0]);
    expect(insightsUrl).toContain("feature.explainability=true");
  });
});
