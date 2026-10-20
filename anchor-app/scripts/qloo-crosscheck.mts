/**
 * Cross-check: do Anchor's own Qloo client and Qloo's official harness (from
 * the hackathon kit) return the same data for the same questions?
 * Uses a few real calls; prints a table and writes docs/qloo-crosscheck.md
 * (numbers only, no raw responses).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { QlooClient } from "../src/lib/qloo/client";
import { FileCache } from "../src/lib/qloo/fileCache";
import { harnessCall, closeHarness } from "../src/lib/qloo/harness";

const key = /^QLOO_API_KEY=(.*)$/m.exec(readFileSync(".env.local", "utf8"))![1].trim();
const rest = new QlooClient({ apiKey: key, cache: new FileCache() });
const places = JSON.parse(readFileSync("data/qloo-cache/k2-men3554.json", "utf8")).results.entities.slice(0, 5) as { entity_id: string; name: string }[];

type Q = { age?: Record<string, number>; gender?: Record<string, number> };
const rows: string[] = [];
let maxDiff = 0;
let compared = 0;
for (const p of places) {
  const r = await rest.insights<{ results?: { demographics?: { query?: Q }[] } }>({ "filter.type": "urn:demographics", "signal.interests.entities": p.entity_id });
  const a = r.data.results?.demographics?.[0]?.query ?? {};
  const h = await harnessCall(key, "qloo_audience_demographics", { entity: p.entity_id, entity_type: "place" });
  const b = ((h.results?.[0] as { query?: Q }) ?? {}).query ?? {};
  const keys = [...Object.keys(a.age ?? {}).map((k) => ["age", k]), ...Object.keys(a.gender ?? {}).map((k) => ["gender", k])] as [keyof Q, string][];
  const diffs = keys.map(([g, k]) => Math.abs((a[g]?.[k] ?? 0) - (b[g]?.[k] ?? NaN)));
  const d = Math.max(...diffs);
  maxDiff = Math.max(maxDiff, d);
  compared += keys.length;
  rows.push(`| ${p.name} | ${h.status} | ${keys.length} | ${Number.isFinite(d) ? d.toFixed(4) : "n/a"} |`);
}
await closeHarness();

const md = [
  "# Cross-check: Anchor's Qloo client vs Qloo's official harness",
  "",
  `Run ${new Date().toISOString()}. Question: audience demographics (urn:demographics) for ${places.length} South Los Angeles places.`,
  "",
  "| Place | Harness status | Values compared | Largest difference |",
  "|---|---|---|---|",
  ...rows,
  "",
  `**Result:** ${compared} values compared; largest difference ${maxDiff.toFixed(4)}. ${maxDiff < 0.001 ? "The two paths agree." : "The two paths disagree; investigate."}`,
].join("\n");
writeFileSync("docs/qloo-crosscheck.md", md + "\n");
console.log(md);
