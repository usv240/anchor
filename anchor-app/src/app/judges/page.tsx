import type { Metadata } from "next";
import Link from "next/link";
import { configured } from "@/lib/api/run";
import { dec, loadResults, pct } from "@/lib/results";

export const metadata: Metadata = { title: "Judge mode" };

type Status = "Live" | "Live, backup path" | "Tested, not used" | "Not available";
const QLOO_USES: [string, string, string, Status][] = [
  ["Place insights in a zone polygon, with age and gender signals", "The places a group loves inside each high-need zone, re-ranked by that group's affinity", "GET /v2/insights?filter.type=urn:entity:place&filter.location=<WKT>&signal.demographics.age=...&signal.demographics.gender=...", "Live"],
  ["Demographic insights", "\"Who loves this place\" chart on every Qloo place", "GET /v2/insights?filter.type=urn:demographics&signal.interests.entities=<id>", "Live"],
  ["Heatmap", "Taste map: where a group's tastes concentrate, next to the need map", "GET /v2/insights?filter.type=urn:heatmap&filter.location.query=Los Angeles", "Live"],
  ["Heatmap with one place as the signal", "Fan reach: how many of a place's 20 strongest fan areas are high-need neighbourhoods (Anchor's community places: 33.5%; Qloo without need: 17.8%)", "GET /v2/insights?filter.type=urn:heatmap&signal.interests.entities=<place id>", "Live"],
  ["Taste analysis", "Talking points: what a group is into around the top zone", "GET /v2/insights?filter.type=urn:tag&signal.location=<WKT>", "Live"],
  ["Cross-domain book insights with explainability", "Reading corner: children's books from the games, shows, films and stars kids love, each labelled with the interest that led to it", "GET /v2/insights?filter.type=urn:entity:book&signal.interests.entities=...&filter.tags=<children's genres>&feature.explainability=true", "Live"],
  ["Entity search and tag search", "Turns \"Minecraft\" or \"barber shop\" into real Qloo ids; nothing invented", "GET /search, GET /v2/tags", "Live"],
  ["Place tags and properties", "Opening days, community tags (Locals, Regulars), alcohol offerings, closed places", "properties.hours, tags, properties.is_closed", "Live"],
  ["Official Qloo harness (MCP)", "Three backup routes (audience charts, fan reach, talking points) and a cross-check that Anchor's client matches Qloo's own tools (40 of 40 values identical)", "qloo mcp: qloo_audience_demographics, qloo_where_popular, qloo_entity_tags", "Live, backup path"],
  ["Harness recommend and rank", "Measured: recommend takes a named area, not a zone polygon, and none of its 20 South LA picks were in the zone's own list; rank failed in the adapter. Not used as a zone backup", "qloo mcp: qloo_recommend, qloo_rank", "Tested, not used"],
  ["Analysis compare", "Works (shared and different tags between two groups of places). Anchor's lists are already built per audience, so it added nothing a health worker needs", "GET /v2/analysis/compare", "Tested, not used"],
  ["Audiences (interest groups)", "Measured: interest audiences moved affinity by only 0.05 and barely changed the order, so they are not used to pick places", "GET /v2/audiences, signal.demographics.audiences", "Tested, not used"],
  ["Explainability on places", "Qloo answers \"Could not calculate explainability\" for demographic-only queries, so place reasons come from affinity rank and tags (it works for books, above)", "feature.explainability=true", "Tested, not used"],
  ["Trending", "Qloo trending does not support places (only artists, brands, films, people, podcasts, TV)", "GET /v2/trending", "Not available"],
  ["Parameter guard, cache, call budget, rate limit, bring your own key", "Refuses parameters Qloo would silently ignore; 4 requests a second at most; private cache", "lib/qloo/params.ts, client.ts, fileCache.ts", "Live"],
];

export default async function JudgesPage() {
  const r = await loadResults();
  const keys = configured();
  return (
    <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
      <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Judge mode</h1>
      <p className="mt-4 text-lg text-muted">Everything you need in about 3 minutes, with a way to check each claim yourself.</p>

      <ol className="mt-10 space-y-6">
        <li className="rounded-[12px] bg-panel p-6">
          <p className="text-sm font-semibold text-accent">30 seconds: what it is</p>
          <p className="mt-2 text-[1.0625rem]">
            When pharmacists met men in their barbershops, 63.6% got their blood pressure under control, against 11.7% with usual care (New England Journal of Medicine, 2018). The programme never spread. Anchor finds
            where it should go next: the neighbourhoods with the most untreated high blood pressure (CDC data) and the local places people there love (Qloo).
          </p>
        </li>
        <li className="rounded-[12px] bg-panel p-6">
          <p className="text-sm font-semibold text-accent">60 seconds: run it</p>
          <p className="mt-2">Open the app; an example is filled in. Press Run plan and watch each step. Open any place to see why it was chosen and the evidence behind it.</p>
          <Link href="/app" className="mt-3 inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4 font-semibold text-accent-contrast">Open the app</Link>
        </li>
        <li className="rounded-[12px] bg-panel p-6">
          <p className="text-sm font-semibold text-accent">60 seconds: the proof</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{pct(r.systems.anchor.needCapture)} of Anchor&apos;s places are in the highest-need fifth of neighbourhoods, against {pct(r.systems.mapSearch.needCapture)} for a map search of barbershops and salons.</li>
            <li>Average need of the neighbourhoods reached: {dec(r.systems.anchor.meanNeedPercentile)} for Anchor, {dec(r.systems.mapSearch.meanNeedPercentile)} for a map search.</li>
            <li>{pct(r.systems.anchor.unsuitableRate)} bars or liquor stores in Anchor&apos;s plans, against {pct(r.systems.mapSearchAny.unsuitableRate)} for a search of local businesses.</li>
            <li>{r.policy.targeting.passed} of {r.policy.targeting.total} race, ethnicity, religion or origin targeting requests reframed to need; {r.policy.controls.passed} of {r.policy.controls.total} look-alike ordinary requests left alone.</li>
          </ul>
          <Link href="/proof" className="mt-3 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4">Full results and method</Link>
        </li>
        <li className="rounded-[12px] bg-panel p-6">
          <p className="text-sm font-semibold text-accent">30 seconds: check it yourself</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Every plan has an evidence chain: open a plan, then &ldquo;Check the whole evidence chain&rdquo;, or call <code className="font-mono">GET /api/v1/plans/&#123;id&#125;/verify</code>.</li>
            <li>Rerun the evaluation from a clean clone: <code className="font-mono">npm run eval</code> (about 10 seconds, public data only).</li>
            <li>Check the formula by hand on the <Link href="/how-it-works#formula" className="text-accent underline underline-offset-4">How it works</Link> page.</li>
          </ul>
        </li>
      </ol>

      <section className="mt-12" aria-labelledby="status-t">
        <h2 id="status-t" className="text-2xl font-semibold">What is running right now</h2>
        <ul className="mt-3 space-y-2">
          <li>Qloo taste data: <strong>{keys.qloo ? "on" : "off (key pending)"}</strong>. Without it, plans use need, venue type and years in business, and say so.</li>
          <li>Claude agent: <strong>{keys.anthropic ? "on" : "off (basic planner)"}</strong>. The ranking is the same published formula either way.</li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="qloo-t">
        <h2 id="qloo-t" className="text-2xl font-semibold">How Anchor uses Qloo</h2>
        <div className="mt-4 overflow-x-auto rounded-[12px] bg-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="p-3">Capability</th>
                <th scope="col" className="p-3">What it does in Anchor</th>
                <th scope="col" className="p-3">Call</th>
                <th scope="col" className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {QLOO_USES.map(([c, w, call, status]) => (
                <tr key={c}>
                  <td className="p-3 font-medium">{c}</td>
                  <td className="p-3">{w}</td>
                  <td className="p-3"><code className="font-mono text-[0.8125rem] break-words">{call}</code></td>
                  <td className={`p-3 ${status === "Live" || status === "Live, backup path" ? "font-medium" : "text-muted"}`}>{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="crit-t">
        <h2 id="crit-t" className="text-2xl font-semibold">The judging criteria</h2>
        <dl className="mt-4 space-y-4">
          {[
            ["Technological implementation", "10 Qloo capabilities in the product (place insights in zone polygons, demographics, heatmaps with an audience or one place as the signal, taste analysis, book insights with explainability, search, tags), 3 of them with Qloo's official harness as a backup, and a cross-check that agrees on 40 of 40 values. A Claude Opus 5.5 tool-using agent with a basic-planner fallback, a citation rule and a tamper-evident evidence log. REST API with OpenAPI, an MCP server with 5 tools, a daily spending guard, and over 260 automated tests."],
            ["Design", "A complete workflow for a health worker: pick who and where, watch each step, get a ranked plan in two (or three) clear groups, a map, an owner invitation letter for each place, a reading-corner book list, and downloads for spreadsheets, calendars and map tools. Upload your current partners to see which reach high-need areas. Share links rebuild themselves if the server forgets a plan. Light and dark, phone and desktop, keyboard and screen reader, info buttons on every feature."],
            ["Potential impact", "Built on one of the strongest blood pressure results ever published (NEJM 2018), aimed at the step that stopped it spreading. Measured: 100% of Anchor's places are in high-need neighbourhoods, against 61% for the same AI model without tools and 18% for a map search, and the result holds in a second county (San Francisco: 100% against 18%). About 684,000 adults in Los Angeles County alone have high blood pressure without medicine (CDC estimates)."],
            ["Quality of the idea", "Taste data used as public health infrastructure: finding the trusted places of each community, and checking that their fans live where the need is (33.5% of fan areas are high need for Anchor's places, against 17.8% for Qloo's top places alone). Qloo alone sends only 6.9% of picks to high-need areas, so need data and taste data only work together. It plans by need, never by race, and says what its data cannot tell you."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[12px] bg-panel p-5">
              <dt className="font-semibold">{k}</dt>
              <dd className="mt-1 text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
