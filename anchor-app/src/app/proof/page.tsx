import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Info } from "@/components/Info";
import { dec, loadResults, pct, type SystemResult } from "@/lib/results";

export const metadata: Metadata = { title: "Proof" };

const COLUMNS = ["anchor", "anchorOffline", "qlooNoNeed", "mapSearch", "mapSearchAny", "aiOnly"] as const;

export default async function ProofPage() {
  const r = await loadResults();
  const cols = COLUMNS.map((k) => ({ key: k, ...r.systems[k] }));
  const cell = (s: SystemResult, f: (s: SystemResult) => string) => (s.pending ? "Pending" : f(s));
  const rows: { label: string; info?: Parameters<typeof Info>[0]["id"]; get: (s: SystemResult) => string }[] = [
    { label: "Places in the highest-need fifth of neighbourhoods", get: (s) => pct(s.needCapture) },
    { label: "Average need of the neighbourhoods (0 to 1)", get: (s) => dec(s.meanNeedPercentile) },
    { label: "Bars, liquor stores and similar", info: "removed", get: (s) => pct(s.unsuitableRate) },
    { label: "Places confirmed in a licence or Qloo listing", info: "verified", get: (s) => pct(s.licensedRate) },
    { label: "Kinds of places per plan", get: (s) => (s.categories === undefined ? "Pending" : s.categories.toFixed(1)) },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6">
      <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Proof</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        We test Anchor against the obvious alternatives, on public data, and publish what it must never do. Run on{" "}
        {new Date(r.runAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}, across {r.requests} plan
        requests in Los Angeles County.
      </p>

      <section aria-labelledby="neg-title" className="mt-10">
        <h2 id="neg-title" className="flex items-center text-2xl font-semibold">
          What Anchor must never do <Info id="proof-negative" />
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { big: pct(r.systems.anchor.unsuitableRate), label: "bars, liquor stores or similar in Anchor's plans", sub: `A map search of local businesses: ${pct(r.systems.mapSearchAny.unsuitableRate)}` },
            { big: `${r.policy.targeting.passed} of ${r.policy.targeting.total}`, label: "requests to target by race, ethnicity, religion or origin were reframed", sub: "Planned by need instead, with an explanation" },
            { big: `${r.policy.controls.passed} of ${r.policy.controls.total}`, label: "ordinary requests were left alone", sub: r.policy.medical.measured ? `And ${r.policy.medical.passed} of ${r.policy.medical.total} requests for medical advice were declined by the AI agent` : "For example Koreatown or Blackwelder Street" },
            { big: pct(r.systems.anchor.licensedRate), label: "of places confirmed in a city licence or a Qloo listing", sub: `AI alone: ${pct(r.systems.aiOnly.licensedRate)} could be confirmed` },
          ].map((c) => (
            <li key={c.label} className="rounded-[12px] bg-panel p-5">
              <ShieldCheck aria-hidden="true" className="text-success" />
              <p className="tabular mt-2 text-3xl font-semibold">{c.big}</p>
              <p className="mt-1">{c.label}</p>
              <p className="mt-1 text-sm text-muted">{c.sub}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cmp-title" className="mt-14">
        <h2 id="cmp-title" className="flex items-center text-2xl font-semibold">
          Anchor against the alternatives <Info id="proof-baselines" />
        </h2>
        <p className="mt-2 max-w-3xl text-muted">
          Each system makes the same number of picks for the same 16 requests. The map searches are repeated 200 times with random picks and averaged.
          Every column is measured with live Qloo and Claude; none are estimates.
        </p>
        <div className="mt-4 overflow-x-auto rounded-[12px] bg-panel">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <caption className="sr-only">Evaluation results by system</caption>
            <thead className="bg-surface-2 text-sm">
              <tr>
                <th scope="col" className="p-3 font-semibold">Measure</th>
                {cols.map((c) => (
                  <th key={c.key} scope="col" className={`p-3 font-semibold ${c.key === "anchor" ? "text-accent" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border bg-surface">
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="p-3 font-normal">
                    <span className="inline-flex items-center">
                      {row.label}
                      {row.info ? <Info id={row.info} className="-my-2" /> : null}
                    </span>
                  </th>
                  {cols.map((c) => (
                    <td key={c.key} className={`p-3 ${c.key === "anchor" ? "font-semibold" : ""} ${c.pending ? "text-muted" : ""}`}>
                      {cell(c, row.get)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      {r.qloo ? (
        <section aria-labelledby="aud-title" className="mt-14">
          <h2 id="aud-title" className="text-2xl font-semibold">Different people, different trusted places</h2>
          <p className="mt-2 max-w-3xl text-muted">
            How much the places each group loves overlap, across all 16 requests (0% means no place in common). Low overlap means Anchor is not giving everyone the same list.
          </p>
          <div className="mt-4 overflow-x-auto rounded-[12px] bg-panel">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="p-3">Group A</th>
                  <th scope="col" className="p-3">Group B</th>
                  <th scope="col" className="p-3">Places in common</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-border bg-surface">
                {r.qloo.audienceOverlap.map((o) => (
                  <tr key={o.a + o.b}>
                    <td className="p-3">{audienceName(o.a)}</td>
                    <td className="p-3">{audienceName(o.b)}</td>
                    <td className="p-3 font-semibold">{pct(o.overlap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>{pct(r.qloo.lovedPlacesMatchedToLicence ?? undefined)} of the places Qloo found were independently confirmed against City of Los Angeles business licences. The rest are listed by Qloo with an address and map location.</li>
            <li>Measured limit: {r.qloo.smallSalonCoverage}</li>
            {r.qloo.aiAudienceOverlap !== null ? (
              <li>
                For comparison, AI alone shares {pct(r.qloo.aiAudienceOverlap)} of its places between two audiences on average ({r.qloo.aiDistinctPlaces}). Anchor shares {pct(r.qloo.meanAudienceOverlap ?? undefined)}.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {r.secondCounty ? (
        <section aria-labelledby="sf-title" className="mt-14">
          <h2 id="sf-title" className="text-2xl font-semibold">Does it work somewhere else? San Francisco</h2>
          <p className="mt-2 max-w-3xl text-muted">
            The same method, run unchanged on a second county with its own public business register, for {r.secondCounty.requests} audiences{r.secondCounty.anchorMode === "qloo" ? ", with live Qloo data" : ""}.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { big: pct(r.secondCounty.anchor.needCapture), label: "of Anchor's places are in the highest-need fifth of neighbourhoods", sub: `Map search of barbershops and salons: ${pct(r.secondCounty.mapSearch.needCapture)}` },
              { big: dec(r.secondCounty.anchor.meanNeedPercentile), label: "average need of the neighbourhoods reached (0 to 1)", sub: `Map search: ${dec(r.secondCounty.mapSearch.meanNeedPercentile)}` },
              { big: pct(r.secondCounty.anchor.unsuitableRate), label: "bars, liquor stores or similar", sub: `${pct(r.secondCounty.anchor.licensedRate)} confirmed in the city register or a Qloo listing` },
            ].map((c) => (
              <li key={c.label} className="rounded-[12px] bg-panel p-5">
                <p className="tabular text-3xl font-semibold">{c.big}</p>
                <p className="mt-1">{c.label}</p>
                <p className="mt-1 text-sm text-muted">{c.sub}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">{r.secondCounty.note}</p>
        </section>
      ) : null}

      {r.qloo?.fanReach?.anchor && r.qloo.fanReach.qlooNoNeed ? (
        <section aria-labelledby="fans-title" className="mt-14">
          <h2 id="fans-title" className="flex items-center text-2xl font-semibold">
            Places whose fans live where the need is <Info id="place-fans" />
          </h2>
          <p className="mt-2 max-w-3xl text-muted">
            A place can sit in a high-need neighbourhood and still draw its crowd from elsewhere. So for each Qloo place, Anchor asks Qloo where its fans are concentrated (the 20 strongest areas) and counts how many are high-need
            neighbourhoods. By chance alone it would be about 1 in 5, because 1 in 5 neighbourhoods is high need.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { big: pct(r.qloo.fanReach.anchor.meanHighNeedShare), label: "of fan areas are high need, for Anchor's community places", sub: `${r.qloo.fanReach.anchor.places} places measured` },
              { big: pct(r.qloo.fanReach.qlooNoNeed.meanHighNeedShare), label: "for Qloo's top places without the need layer", sub: `${r.qloo.fanReach.qlooNoNeed.places} places measured` },
            ].map((c) => (
              <li key={c.label} className="rounded-[12px] bg-panel p-5">
                <p className="tabular text-3xl font-semibold">{c.big}</p>
                <p className="mt-1">{c.label}</p>
                <p className="mt-1 text-sm text-muted">{c.sub}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="def-title" className="mt-14">
        <h2 id="def-title" className="text-2xl font-semibold">What each measure means</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(r.definitions).map(([k, v]) => (
            <div key={k} className="rounded-[12px] bg-panel p-4">
              <dt className="font-mono text-sm">{k}</dt>
              <dd className="mt-1 text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="rt-title" className="mt-14">
        <h2 id="rt-title" className="text-2xl font-semibold">Every policy test, one by one</h2>
        <details className="mt-4 rounded-[12px] bg-panel">
          <summary className="flex min-h-12 cursor-pointer items-center px-5 font-medium">Show all {r.policy.rows.length} tests</summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="p-3">Test</th>
                  <th scope="col" className="p-3">Kind</th>
                  <th scope="col" className="p-3">Expected</th>
                  <th scope="col" className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.policy.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3 font-mono">{row.id}</td>
                    <td className="p-3">{row.kind}</td>
                    <td className="p-3">{row.expect.replace(/_/g, " ")}</td>
                    <td className="p-3">{row.pass === null ? <span className="text-muted">Pending</span> : row.pass ? "Pass" : <strong className="text-danger">Fail</strong>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="mt-2 text-sm text-muted">The prompts are in the repository at eval/redteam/anchor.jsonl.</p>
      </section>

      <section aria-labelledby="rerun-title" className="mt-14 rounded-[12px] bg-panel p-6">
        <h2 id="rerun-title" className="text-xl font-semibold">Rerun it yourself</h2>
        <p className="mt-2 text-muted">Clone the repository, then run one command. Without a Qloo key it uses only public data and takes about 10 seconds; with your own Qloo key it adds the Qloo comparisons and takes about a minute the first time.</p>
        <pre className="mt-3 overflow-x-auto rounded-[8px] bg-surface-2 p-4 font-mono text-sm">npm install{"\n"}npm run eval</pre>
        <p className="mt-3 text-sm text-muted">
          Raw results: <Link className="text-accent underline underline-offset-4" href="/data/eval/results.json">results.json</Link>
        </p>
      </section>
    </div>
  );
}

function audienceName(key: string): string {
  const [ages, gender] = key.split("/");
  const age = ages.replace("18_to_34", "18 to 34").replace("35_to_54", "35 to 54").replace("55_plus", "55 and older").replace("+", " and ");
  const who = gender === "male" ? "Men" : gender === "female" ? "Women" : "Adults";
  return `${who} ${age}`;
}
