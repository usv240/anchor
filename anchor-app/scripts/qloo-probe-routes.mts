/**
 * Probe of the Qloo routes Anchor does not use yet, Oct 20. For each: does it
 * answer, and is the answer useful for Anchor? Prints counts and names only;
 * full responses go to the private cache (data/qloo-cache/routes/, git-ignored).
 *
 *   Harness: qloo_recommend, qloo_rank, qloo_trends, qloo_compare_audiences,
 *            qloo_entity_tags, qloo_where_popular, qloo_find_tags, qloo_describe
 *   REST:    /v2/trending (TV and films), books with explainability, /v2/analysis/compare
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { QlooClient } from "../src/lib/qloo/client";
import { FileCache } from "../src/lib/qloo/fileCache";
import { harnessCall, closeHarness } from "../src/lib/qloo/harness";

const key = /^QLOO_API_KEY=(.*)$/m.exec(readFileSync(".env.local", "utf8"))![1].trim();
const rest = new QlooClient({ apiKey: key, cache: new FileCache(), budget: 40 });
mkdirSync("data/qloo-cache/routes", { recursive: true });
const save = (name: string, data: unknown) => writeFileSync(`data/qloo-cache/routes/${name}.json`, JSON.stringify(data, null, 2));

type E = { entity_id: string; name: string };
const men = (JSON.parse(readFileSync("data/qloo-cache/k2-men3554.json", "utf8")).results.entities as E[]).slice(0, 10);
const women = (JSON.parse(readFileSync("data/qloo-cache/k2-women55.json", "utf8")).results.entities as E[]).slice(0, 10);
const zone = JSON.parse(readFileSync("public/data/need/06037/zones.geojson", "utf8")).features[0].properties as { zoneId: string; wkt: string };

async function h(name: string, tool: string, args: Record<string, unknown>) {
  try {
    const r = await harnessCall(key, tool, args, 30_000);
    save(name, r);
    const names = (r.results ?? []).slice(0, 5).map((x) => (x as { name?: string }).name ?? JSON.stringify(x).slice(0, 60));
    console.log(`${name.padEnd(22)} ${r.status.padEnd(12)} ${(r.results ?? []).length} results  ${r.summary?.slice(0, 120) ?? ""}\n    ${names.join(" | ")}`);
    return r;
  } catch (e) {
    console.log(`${name.padEnd(22)} ERROR ${(e as Error).message}`);
  }
}
async function g(name: string, p: string, params: Record<string, string | number | boolean>) {
  try {
    const r = await (rest as unknown as { get: (p: string, q: object, op: string) => Promise<{ data: unknown }> }).get(p, params, `probe.${name}`);
    save(name, r.data);
    console.log(`${name.padEnd(22)} ok  ${JSON.stringify(r.data).slice(0, 220)}`);
    return r.data;
  } catch (e) {
    console.log(`${name.padEnd(22)} ERROR ${(e as Error).message.slice(0, 200)}`);
  }
}

console.log(`zone ${zone.zoneId}, wkt ${zone.wkt.length} chars\n`);
await h("recommend-wkt", "qloo_recommend", { target_type: "place", demographic: "men 35-54", filter_location: zone.wkt, limit: 20, explain: true });
await h("recommend-name", "qloo_recommend", { target_type: "place", demographic: "men 35-54", filter_location: "South Los Angeles, Los Angeles, CA", limit: 20 });
await h("rank", "qloo_rank", { candidates: men.slice(0, 5).map((e) => e.entity_id), demographic: "women 55 and older", signal_location: "Los Angeles, CA" });
await h("trends", "qloo_trends", { entities: men.slice(0, 3).map((e) => e.entity_id), entity_type: "place", start_date: "2026-07-01", end_date: "2026-10-15" });
await h("compare-audiences", "qloo_compare_audiences", { group_a: men.slice(0, 5).map((e) => e.entity_id), group_b: women.slice(0, 5).map((e) => e.entity_id), limit: 10 });
await h("entity-tags", "qloo_entity_tags", { entities: men.slice(0, 5).map((e) => e.entity_id), entity_type: "place", limit: 15 });
await h("where-popular", "qloo_where_popular", { entity: men[0].entity_id, entity_type: "place", within: "Los Angeles, CA", limit: 10 });
await h("find-tags", "qloo_find_tags", { query: "barber shop", limit: 5 });
await h("describe", "qloo_describe", { entity: "Minecraft", type: "videogame" });

await g("trending-tv", "/v2/trending", { "filter.type": "urn:entity:tv_show", take: 10 });
await g("trending-movie", "/v2/trending", { "filter.type": "urn:entity:movie", take: 10 });
const mc = (await rest.search<{ results?: E[] }>("Minecraft", "urn:entity:videogame", 1)).data.results?.[0];
if (mc)
  await g("books-explain", "/v2/insights", {
    "filter.type": "urn:entity:book",
    "signal.interests.entities": mc.entity_id,
    "filter.tags": "urn:tag:genre:media:childrens",
    "feature.explainability": true,
    take: 5,
  });
await g("compare-rest", "/v2/analysis/compare", { "a.signal.interests.entities": men.slice(0, 5).map((e) => e.entity_id).join(","), "b.signal.interests.entities": women.slice(0, 5).map((e) => e.entity_id).join(","), take: 10 });

await closeHarness();
