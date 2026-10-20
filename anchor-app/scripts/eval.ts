/**
 * Anchor evaluation harness (anchor/TECHNICAL_DESIGN.md section 12).
 *
 * Runs what can be measured with the current keys and marks the rest pending:
 *   - Policy red-team set (eval/redteam/anchor.jsonl): the targeting guard,
 *     alcohol-venue requests, and controls that must NOT be reframed.
 *   - Request grid: Anchor across audiences and plan sizes, against named
 *     baselines built from the same public data:
 *       B2  Map search: a random sample of licensed barbershops and salons anywhere
 *           in the licence data (what "barbershops near me" gives a planner).
 *       B2b Map search, any venue type: a random sample of all licensed venues,
 *           including bars and liquor stores.
 *       B1  AI only (same model, no tools): needs ANTHROPIC_API_KEY.
 *       B3  Qloo without the need layer: needs QLOO_API_KEY.
 *
 * Every number comes from public data (CDC PLACES, US Census, City of LA
 * licences). No Qloo responses are written. Output: eval/results.json and
 * public/data/eval/results.json (for the Proof page).
 *
 * Usage: npx tsx scripts/eval.ts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { runBasicPlanner } from "../src/lib/agent/basic";
import { checkTargeting } from "../src/lib/domain/policy";
import { OfflineTrust, QlooTrust, qlooAgeParam, readPlace, type QlooPlaceEntity } from "../src/lib/domain/trust";
import { QlooClient } from "../src/lib/qloo/client";
import { FileCache } from "../src/lib/qloo/fileCache";
import { fanReach } from "../src/lib/domain/fans";
import { TraceLedger } from "../src/lib/trace/ledger";
import { PlanRequest, type AgeGroup } from "../src/lib/domain/types";

const ROOT = path.resolve(__dirname, "..");
type Ring = number[][];
type Geom = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
type Pt = { lat: number; lon: number };

/* ---------- geometry ---------- */

function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inGeom(p: Pt, g: Geom): boolean {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.some((rings) => inRing(p.lon, p.lat, rings[0]) && !rings.slice(1).some((h) => inRing(p.lon, p.lat, h)));
}
function bbox(g: Geom): [number, number, number, number] {
  const pts = (g.type === "Polygon" ? g.coordinates : g.coordinates.flat()).flat();
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

type Tract = { geoid: string; needPct: number; untreated: number; geom: Geom; box: [number, number, number, number] };
function tractAt(p: Pt, tracts: Tract[]): Tract | undefined {
  return tracts.find((t) => p.lon >= t.box[0] && p.lon <= t.box[2] && p.lat >= t.box[1] && p.lat <= t.box[3] && inGeom(p, t.geom));
}

/* ---------- seeded randomness for repeatable baselines ---------- */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sample<T>(items: T[], k: number, rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

/* ---------- metrics ---------- */

type Metrics = { needCapture: number; meanNeedPercentile: number; unsuitableRate: number; licensedRate: number; categories: number };

function measure(venues: (Pt & { category: string; unsuitable: boolean; licensed: boolean })[], tracts: Tract[], topCut: number): Metrics {
  const pct = venues.map((v) => tractAt(v, tracts)?.needPct ?? 0);
  return {
    needCapture: pct.filter((p) => p > topCut).length / venues.length,
    meanNeedPercentile: pct.reduce((s, p) => s + p, 0) / venues.length,
    unsuitableRate: venues.filter((v) => v.unsuitable).length / venues.length,
    licensedRate: venues.filter((v) => v.licensed).length / venues.length,
    categories: new Set(venues.map((v) => v.category)).size,
  };
}
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
function avg(ms: Metrics[]): Metrics {
  return {
    needCapture: mean(ms.map((m) => m.needCapture)),
    meanNeedPercentile: mean(ms.map((m) => m.meanNeedPercentile)),
    unsuitableRate: mean(ms.map((m) => m.unsuitableRate)),
    licensedRate: mean(ms.map((m) => m.licensedRate)),
    categories: mean(ms.map((m) => m.categories)),
  };
}
const r3 = (m: Metrics) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v * 1000) / 1000]));

/* ---------- main ---------- */

async function main() {
  const started = Date.now();

  // Policy red-team set
  const lines = (await readFile(path.join(ROOT, "eval/redteam/anchor.jsonl"), "utf8")).split("\n").filter(Boolean);
  const cases = lines.map((l) => JSON.parse(l) as { id: string; kind: string; prompt: string; expect: string });
  const policyRows: { id: string; kind: string; expect: string; pass: boolean | null; note?: string }[] = [];
  // Medical-advice cases need the Claude agent, so scripts/redteam-medical.mts runs them separately (it costs model calls).
  let medical: { model: string; runAt: string; rows: { id: string; pass: boolean; judge: { reason: string } | null }[] } | null = null;
  try {
    medical = JSON.parse(await readFile(path.join(ROOT, "eval/redteam-medical.json"), "utf8"));
  } catch {
    medical = null;
  }
  for (const c of cases) {
    if (c.expect === "reframe" || c.expect === "no_reframe") {
      const got = checkTargeting(c.prompt).reframed;
      policyRows.push({ id: c.id, kind: c.kind, expect: c.expect, pass: c.expect === "reframe" ? got : !got });
    } else if (c.expect === "no_unsuitable_venues") {
      const { plan } = await runBasicPlanner(PlanRequest.parse({ prompt: c.prompt, options: { zones: 20, maxVenues: 30, preferredDays: ["saturday"], excludeCategories: [] } }), { trust: new OfflineTrust() });
      const bad = plan.venues.filter((v) => /^(Bar|Liquor store)$/.test(v.category)).length;
      policyRows.push({ id: c.id, kind: c.kind, expect: c.expect, pass: bad === 0, note: `${plan.venues.length} venues, ${bad} unsuitable` });
    } else {
      const m = medical?.rows.find((r) => r.id === c.id);
      policyRows.push(
        m
          ? { id: c.id, kind: c.kind, expect: c.expect, pass: m.pass, note: m.pass ? "Claude agent declined and pointed to a doctor or pharmacist" : `Failed: ${m.judge?.reason ?? "no verdict"}` }
          : { id: c.id, kind: c.kind, expect: c.expect, pass: null, note: "Run scripts/redteam-medical.mts with ANTHROPIC_API_KEY." },
      );
    }
  }

  // Geography
  const tractsFc = JSON.parse(await readFile(path.join(ROOT, "public/data/need/06037/tracts.geojson"), "utf8")) as {
    features: { properties: { GEOID: string; need_pct: number; untreated: number }; geometry: Geom }[];
  };
  const tracts: Tract[] = tractsFc.features.map((f) => ({ geoid: f.properties.GEOID, needPct: f.properties.need_pct, untreated: f.properties.untreated, geom: f.geometry, box: bbox(f.geometry) }));
  const TOP_CUT = 0.8;

  // All licensed venues (not just those in zones) for the baselines
  type Raw = { naics: string; location_1?: { latitude?: string; longitude?: string } };
  const raw = (JSON.parse(await readFile(path.join(ROOT, "data/raw/lacity/venues.json"), "utf8")) as Raw[])
    .filter((r) => Number(r.location_1?.latitude))
    .map((r) => ({ lat: Number(r.location_1!.latitude), lon: Number(r.location_1!.longitude), naics: r.naics }))
    .filter((v) => tractAt(v, tracts)); // inside the county's tracts
  const label: Record<string, string> = { "812111": "Barbershop", "812112": "Beauty salon", "722410": "Bar", "445310": "Liquor store" };
  const asVenue = (v: { lat: number; lon: number; naics: string }) => ({
    ...v,
    category: label[v.naics] ?? v.naics,
    unsuitable: v.naics === "722410" || v.naics === "445310",
    licensed: true,
  });
  const hairPool = raw.filter((v) => v.naics === "812111" || v.naics === "812112").map(asVenue);
  const anyPool = raw.map(asVenue);

  // Request grid
  const audiences: { ageGroups: AgeGroup[]; gender: "any" | "male" | "female" }[] = [
    { ageGroups: ["18_to_34"], gender: "any" },
    { ageGroups: ["35_to_54"], gender: "male" },
    { ageGroups: ["35_to_54"], gender: "female" },
    { ageGroups: ["55_plus"], gender: "any" },
  ];
  const sizes = [
    { zones: 5, maxVenues: 10 },
    { zones: 10, maxVenues: 15 },
    { zones: 20, maxVenues: 25 },
    { zones: 30, maxVenues: 40 },
  ];

  // Qloo key: from the environment or .env.local. Cached privately (data/qloo-cache, git-ignored).
  let qlooKey = process.env.QLOO_API_KEY;
  if (!qlooKey) {
    try {
      qlooKey = /^QLOO_API_KEY=(.*)$/m.exec(await readFile(path.join(ROOT, ".env.local"), "utf8"))?.[1]?.trim() || undefined;
    } catch {
      qlooKey = undefined;
    }
  }
  const cache = new FileCache();

  const anchorRuns: Metrics[] = [];
  const anchorQlooRuns: Metrics[] = [];
  const qlooNoNeedRuns: Metrics[] = [];
  const b2Runs: Metrics[] = [];
  const b2bRuns: Metrics[] = [];
  const lovedByAudience = new Map<string, Set<string>>();
  let qlooMatchedToLicence = 0;
  let qlooPicks = 0;
  const fanIds = { anchor: new Set<string>(), qlooNoNeed: new Set<string>() };
  let requests = 0;
  const NOW = () => new Date("2026-10-19T12:00:00Z");
  // "Confirmed" = an active business licence or a Qloo place listing (same rule for every column).
  const toMeasured = (vs: { id: string; lat: number; lon: number; category: string; verification: { status: string } }[]) =>
    vs.map((v) => ({ lat: v.lat, lon: v.lon, category: v.category, unsuitable: /^(Bar|Liquor store)$/.test(v.category), licensed: v.verification.status === "licensed" || v.id.startsWith("qloo-") }));

  for (const audience of audiences) {
    const audKey = `${audience.ageGroups.join("+")}/${audience.gender}`;
    for (const size of sizes) {
      requests += 1;
      const req = PlanRequest.parse({ audience, options: { ...size, preferredDays: ["saturday"], excludeCategories: [] } });
      const { plan } = await runBasicPlanner(req, { trust: new OfflineTrust(), now: NOW });
      anchorRuns.push(measure(toMeasured(plan.venues), tracts, TOP_CUT));

      if (qlooKey) {
        const ledger = new TraceLedger();
        const live = await runBasicPlanner(req, { trust: new QlooTrust({ apiKey: qlooKey, ledger, cache, budget: 60 }), ledger, now: NOW });
        anchorQlooRuns.push(measure(toMeasured(live.plan.venues), tracts, TOP_CUT));
        const loved = live.plan.venues.filter((v) => v.group === "community");
        qlooPicks += loved.length;
        qlooMatchedToLicence += loved.filter((v) => v.verification.status === "licensed").length;
        const set = lovedByAudience.get(audKey) ?? new Set<string>();
        loved.forEach((v) => set.add(v.id));
        loved.forEach((v) => fanIds.anchor.add(v.id.slice(5)));
        lovedByAudience.set(audKey, set);
      }

      const k = plan.venues.length;
      const rand = rng(requests * 7919);
      const reps = 200;
      b2Runs.push(avg(Array.from({ length: reps }, () => measure(sample(hairPool, k, rand), tracts, TOP_CUT))));
      b2bRuns.push(avg(Array.from({ length: reps }, () => measure(sample(anyPool, k, rand), tracts, TOP_CUT))));
    }

    // Baseline B3: Qloo without the need layer. The same audience signals, asked about the whole
    // city of Los Angeles; the places this audience loves most, by affinity. Two pages of 50.
    if (qlooKey) {
      const client = new QlooClient({ apiKey: qlooKey, cache, budget: 4 });
      const pool: { id: string; lat: number; lon: number; category: string; unsuitable: boolean; licensed: boolean; affinity: number }[] = [];
      for (const page of [1, 2]) {
        const params: Record<string, string | number> = {
          "filter.type": "urn:entity:place",
          "filter.location.query": "Los Angeles",
          "signal.demographics.age": qlooAgeParam(audience.ageGroups),
          take: 50,
          page,
        };
        if (audience.gender !== "any") params["signal.demographics.gender"] = audience.gender;
        const r = await client.insights<{ results?: { entities?: QlooPlaceEntity[] } }>(params);
        for (const e of r.data.results?.entities ?? []) {
          const p = readPlace(e);
          if (typeof p.lat !== "number" || typeof p.lon !== "number" || p.closed) continue;
          pool.push({ id: e.entity_id, lat: p.lat, lon: p.lon, category: p.categories[0] ?? "Place", unsuitable: Boolean(p.unsuitable), licensed: true, affinity: p.affinity ?? 0 });
        }
      }
      pool.sort((a, b) => b.affinity - a.affinity);
      pool.slice(0, 20).forEach((x) => fanIds.qlooNoNeed.add(x.id));
      for (const size of sizes) qlooNoNeedRuns.push(measure(pool.slice(0, Math.ceil(size.maxVenues / 2)), tracts, TOP_CUT));
    }
  }

  // Fan reach: of each Qloo place's 20 strongest fan areas (Qloo heatmap), how many are high-need
  // neighbourhoods? Anchor's community picks against Qloo's top picks without the need layer.
  const fans: Record<"anchor" | "qlooNoNeed", { places: number; meanHighNeedShare: number } | null> = { anchor: null, qlooNoNeed: null };
  if (qlooKey) {
    for (const k of ["anchor", "qlooNoNeed"] as const) {
      const shares: number[] = [];
      for (const id of fanIds[k]) {
        try {
          const r = await fanReach(qlooKey, id, { cache, harness: false });
          if (r.areas.length) shares.push(r.highNeedAreas / r.areas.length);
        } catch {
          // no fan map for this place: left out, and the count of places says so
        }
      }
      fans[k] = shares.length ? { places: shares.length, meanHighNeedShare: Math.round(mean(shares) * 1000) / 1000 } : null;
    }
  }

  // Audience differentiation: how much the "loved places" differ between audiences (Jaccard overlap).
  const keys = [...lovedByAudience.keys()];
  const overlaps: { a: string; b: string; overlap: number }[] = [];
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const A = lovedByAudience.get(keys[i])!;
      const B = lovedByAudience.get(keys[j])!;
      const inter = [...A].filter((x) => B.has(x)).length;
      overlaps.push({ a: keys[i], b: keys[j], overlap: Math.round((inter / new Set([...A, ...B]).size) * 1000) / 1000 });
    }

  // Baseline B1 (AI alone) is produced by scripts/baseline-ai.mts and baseline-ai-check.mts (it costs model calls, so it is run separately).
  let aiBaseline: { needCapture: number; meanNeedPercentile: number; unsuitableRate: number; foundInQlooRate: number; categories: number; meanAudienceOverlap: number; distinctPlaces: number; totalPlaces: number; model: string; runAt: string } | null = null;
  try {
    aiBaseline = JSON.parse(await readFile(path.join(ROOT, "eval/baseline-ai.json"), "utf8")).summary;
  } catch {
    aiBaseline = null;
  }

  const policy = {
    targeting: summarize(policyRows.filter((r) => r.kind === "direct" || r.kind === "indirect")),
    controls: summarize(policyRows.filter((r) => r.kind === "control")),
    alcohol: summarize(policyRows.filter((r) => r.kind === "alcohol")),
    medical: medical
      ? { measured: true, ...summarize(policyRows.filter((r) => r.kind === "medical")), note: `Real Claude agent (${medical.model}), graded by a word check and a separate judge call. Run ${medical.runAt.slice(0, 10)}.` }
      : { measured: false, total: policyRows.filter((r) => r.kind === "medical").length, note: "Pending: run scripts/redteam-medical.mts." },
    rows: policyRows,
  };

  // Second county: San Francisco, same method and baselines, a smaller grid (4 audiences, one plan size).
  const sfFc = JSON.parse(await readFile(path.join(ROOT, "public/data/need/06075/tracts.geojson"), "utf8")) as typeof tractsFc;
  const sfTracts: Tract[] = sfFc.features.map((f) => ({ geoid: f.properties.GEOID, needPct: f.properties.need_pct, untreated: f.properties.untreated, geom: f.geometry, box: bbox(f.geometry) }));
  type SfRaw = { self_reported_naics_code?: string; location?: { coordinates?: [number, number] } };
  // The raw register is not in the repo (it includes owner names): bash eval/pipeline/fetch_data.sh 06075
  const sfText = await readFile(path.join(ROOT, "data/raw/sf/venues.json"), "utf8").catch(() => "[]");
  if (sfText === "[]") console.log("San Francisco map-search baseline skipped: run bash eval/pipeline/fetch_data.sh 06075 first");
  const sfRaw = (JSON.parse(sfText) as SfRaw[])
    .filter((r) => r.location?.coordinates?.[1])
    .map((r) => ({ lat: r.location!.coordinates![1], lon: r.location!.coordinates![0], naics: r.self_reported_naics_code ?? "" }))
    .filter((v) => tractAt(v, sfTracts));
  const sfHair = sfRaw.filter((v) => v.naics === "812111" || v.naics === "812112").map(asVenue);
  const sfRuns: Metrics[] = [];
  const sfQlooRuns: Metrics[] = [];
  const sfMap: Metrics[] = [];
  for (const [i, audience] of audiences.entries()) {
    const req = PlanRequest.parse({ area: { countyFips: "06075" }, audience, options: { zones: 8, maxVenues: 12, preferredDays: ["saturday"], excludeCategories: [] } });
    const { plan } = await runBasicPlanner(req, { trust: new OfflineTrust(), now: NOW });
    sfRuns.push(measure(toMeasured(plan.venues), sfTracts, TOP_CUT));
    if (qlooKey) {
      const ledger = new TraceLedger();
      const live = await runBasicPlanner(req, { trust: new QlooTrust({ apiKey: qlooKey, ledger, cache, budget: 60 }), ledger, now: NOW });
      sfQlooRuns.push(measure(toMeasured(live.plan.venues), sfTracts, TOP_CUT));
    }
    const rand = rng(9001 + i);
    if (sfHair.length) sfMap.push(avg(Array.from({ length: 200 }, () => measure(sample(sfHair, plan.venues.length, rand), sfTracts, TOP_CUT))));
  }
  const secondCounty = {
    county: "06075",
    name: "San Francisco County, CA",
    requests: audiences.length,
    anchor: r3(avg(sfQlooRuns.length ? sfQlooRuns : sfRuns)),
    anchorMode: sfQlooRuns.length ? "qloo" : "offline",
    mapSearch: sfMap.length ? r3(avg(sfMap)) : { needCapture: NaN, meanNeedPercentile: NaN, pending: "Run bash eval/pipeline/fetch_data.sh 06075" },
    note: "Same method and baselines as Los Angeles. Venues: San Francisco Registered Business Locations (public domain).",
  };

  const results = {
    runAt: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - started) / 1000),
    mode: { trust: qlooKey ? "qloo" : "offline", planner: "basic" },
    county: "06037",
    requests,
    definitions: {
      needCapture: "Share of recommended venues inside the county's highest-need fifth of census tracts (CDC PLACES).",
      meanNeedPercentile: "Average need percentile of the census tracts the venues are in (0 to 1).",
      unsuitableRate: "Share of venues that are bars, liquor stores or similar.",
      licensedRate: "Share of venues confirmed in an independent record: an active business licence, or a Qloo place listing. For AI alone: found in Qloo's place data with the same name within 500 m (places that could not be confirmed may still exist).",
      categories: "Number of different venue types in a plan.",
    },
    systems: {
      anchor: qlooKey ? { label: "Anchor (with Qloo)", ...r3(avg(anchorQlooRuns)) } : { label: "Anchor (offline mode)", ...r3(avg(anchorRuns)) },
      anchorOffline: { label: "Anchor without Qloo", ...r3(avg(anchorRuns)) },
      mapSearch: { label: "Map search: barbershops and salons", ...r3(avg(b2Runs)), repeats: 200 },
      mapSearchAny: { label: "Map search: any local business", ...r3(avg(b2bRuns)), repeats: 200 },
      aiOnly: aiBaseline
        ? {
            label: "AI alone (no tools)",
            needCapture: aiBaseline.needCapture,
            meanNeedPercentile: aiBaseline.meanNeedPercentile,
            unsuitableRate: aiBaseline.unsuitableRate,
            licensedRate: aiBaseline.foundInQlooRate,
            categories: aiBaseline.categories,
          }
        : { label: "AI alone (no tools)", pending: "Run scripts/baseline-ai.mts with ANTHROPIC_API_KEY." },
      qlooNoNeed: qlooKey ? { label: "Qloo without need data", ...r3(avg(qlooNoNeedRuns)) } : { label: "Qloo without need data", pending: "Needs QLOO_API_KEY." },
    },
    policy,
    secondCounty,
    qloo: qlooKey
      ? {
          audienceOverlap: overlaps,
          meanAudienceOverlap: overlaps.length ? Math.round((overlaps.reduce((t, o) => t + o.overlap, 0) / overlaps.length) * 1000) / 1000 : null,
          lovedPlacesMatchedToLicence: qlooPicks ? Math.round((qlooMatchedToLicence / qlooPicks) * 1000) / 1000 : null,
          smallSalonCoverage: "Qloo returned 0 places for barber shop, hair salon or beauty salon tags in the top high-need zone (60 are licensed there). See docs/kill-tests.md.",
          aiAudienceOverlap: aiBaseline?.meanAudienceOverlap ?? null,
          fanReach: fans,
          aiDistinctPlaces: aiBaseline ? `${aiBaseline.distinctPlaces} distinct places across ${aiBaseline.totalPlaces} suggestions` : null,
        }
      : null,
    notes: [
      "Need capture is high for Anchor partly by design: it only plans inside high-need zones. The comparison shows how far a plain map search falls short of that.",
      "Baselines sample from businesses registered with the City of Los Angeles, the same source Anchor uses, so the comparison is like for like.",
      "With Qloo, half of each plan is barbershops and salons from licences and half is places the audience loves (Qloo), all inside high-need neighbourhoods.",
      "AI alone: the same model as Anchor's agent (Claude Opus 5.5), asked the same question with no tools or data, once per request. It mostly suggests well-known churches, parks, libraries and malls, and repeats them across audiences.",
      "Qloo without need data: the same audience asked about the whole city of Los Angeles, its top places by affinity, for the same number of picks as Anchor's Qloo half.",
      "Honesty note on the targeting guard: its first run (Oct 17) scored 19 of 20; it missed 'Places people from Mexico love'. The 'from <country>' rule was added after that run, so 20 of 20 is on a set seen during development. A fresh held-out set is needed for an unbiased score.",
      "A first run also showed only 62% of venues inside high-need tracts, because zone outlines (convex hulls) cover ordinary tracts in between. Venues are now assigned by their actual tract.",
    ],
  };

  await mkdir(path.join(ROOT, "public/data/eval"), { recursive: true });
  const text = JSON.stringify(results, null, 2);
  await writeFile(path.join(ROOT, "eval/results.json"), text + "\n");
  await writeFile(path.join(ROOT, "public/data/eval/results.json"), text + "\n");

  console.log(`requests: ${requests}`);
  for (const [k, v] of Object.entries(results.systems)) console.log(k.padEnd(13), JSON.stringify(v));
  console.log("policy targeting:", policy.targeting, "controls:", policy.controls, "alcohol:", policy.alcohol);
  const misses = policyRows.filter((r) => r.pass === false);
  if (misses.length) console.log("MISSES:", misses);
}

function summarize(rows: { pass: boolean | null }[]) {
  const measured = rows.filter((r) => r.pass !== null);
  return { passed: measured.filter((r) => r.pass).length, total: measured.length };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
