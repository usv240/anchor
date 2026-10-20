import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "@/components/Info";
import { runBasicPlanner } from "@/lib/agent/basic";
import { WEIGHTS } from "@/lib/domain/scoring";
import { OfflineTrust } from "@/lib/domain/trust";
import { PlanRequest } from "@/lib/domain/types";
import { loadNeed } from "@/lib/need";

export const metadata: Metadata = { title: "How it works" };

const fmt = new Intl.NumberFormat("en-US");

async function examplePlan() {
  "use cache";
  const { plan } = await runBasicPlanner(PlanRequest.parse({ audience: { ageGroups: ["35_to_54"], gender: "male" } }), {
    trust: new OfflineTrust(),
    now: () => new Date("2026-10-17T12:00:00Z"),
  });
  return plan;
}

function Step({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border-t border-border py-10">
      <p className="text-sm font-semibold text-accent">Step {n}</p>
      <h2 id={`${id}-t`} className="mt-1 text-2xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-4 text-[1.0625rem]">{children}</div>
    </section>
  );
}

export default async function HowItWorks() {
  const [{ summary }, plan] = await Promise.all([loadNeed("06037"), examplePlan()]);
  const top = plan.venues.slice(0, 3);

  return (
    <div className="mx-auto max-w-[860px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">How Anchor works</h1>
      <p className="mt-4 text-lg text-muted">
        Five steps, each recorded so it can be checked. This page uses a real plan for men aged 35 to 54 in Los Angeles County, computed when the page was built.
      </p>

      <Step id="who" n={1} title="You choose who and where">
        <p>A goal (for example free blood pressure checks), an age group, optionally a gender, and a county. Nothing about any individual person is collected.</p>
        <p className="layer-technical rounded-[8px] bg-surface-2 p-3 font-mono text-sm">POST /api/v1/plans {`{ "audience": { "ageGroups": ["35_to_54"], "gender": "male" } }`}</p>
      </Step>

      <Step id="need" n={2} title="Anchor finds the need">
        <p>
          CDC estimates, for each of the county&apos;s {fmt.format(summary.tracts)} neighbourhoods (census tracts), how many adults have high blood pressure and how many of them take medicine for it. Anchor works out
          how many likely go without, about {fmt.format(summary.estUntreatedAdults)} adults across the county, and groups the highest-need fifth of neighbourhoods into {summary.zones} zones that one outreach team can cover.
        </p>
        <div className="layer-technical rounded-[8px] bg-surface-2 p-3 font-mono text-sm">
          <p>untreated = adults x bphigh x (1 - bpmed)</p>
          <p>need = 0.5 x percentile(untreated) + 0.5 x percentile(bphigh)</p>
          <p>zones: top 20% of tracts, grouped within 800 m, split above 15 sq km. Source: CDC PLACES 2025 (yjkw-uj5s).</p>
        </div>
        <p className="flex items-center text-sm text-muted">
          These are model-based estimates, not patient counts. <Info id="estimates" />
        </p>
      </Step>

      <Step id="trust" n={3} title="Anchor finds the trust">
        <p>Every plan has two halves, and both stay inside the high-need neighbourhoods.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Barbershops and salons</strong>, the kind of place the barbershop study tested. They come from city business licences, because Qloo&apos;s place data does not cover small neighbourhood shops. We measured
            this: in the top zone, Qloo returned no barbershops or salons, while 60 are licensed there.
          </li>
          <li>
            <strong>Places this group loves</strong>, from Qloo. Anchor asks Qloo about every place in the zone for the chosen age group and gender. Qloo lists places by popularity, so Anchor re-ranks them by this
            group&apos;s affinity and keeps only the group&apos;s top third. Bars, liquor stores, cannabis shops and closed places are removed. Where it can, Anchor matches each place to a city licence.
          </li>
        </ul>
        <p>
          Different people get different places. In our tests, men and women aged 35 to 54 had no loved place in common at all. For each Qloo place, a chart shows which ages and genders love it, from Qloo&apos;s demographic data.
        </p>
        <p className="layer-technical rounded-[8px] bg-surface-2 p-3 font-mono text-sm">
          GET /v2/insights?filter.type=urn:entity:place&amp;filter.location=&lt;zone polygon&gt;&amp;signal.demographics.age=35_to_44,45_to_54&amp;signal.demographics.gender=male&amp;take=50, then sort by
          query.affinity and keep the top third. trust = 0.6 affinity + 0.2 popularity + 0.2 community, where community counts Qloo tags such as Locals and Regulars.
        </p>
      </Step>

      <Step id="check" n={4} title="Anchor checks every place">
        <p>
          Each place must have an active City of Los Angeles business licence, sit inside an actual high-need neighbourhood, and be a shopfront. Bars, liquor stores and similar are removed: in this example,{" "}
          {plan.counts.unsuitableRemoved} were left out. Private individuals trading under their own name, home addresses and mobile services are never listed.
        </p>
      </Step>

      <Step id="plan" n={5} title="Anchor ranks and plans">
        <p id="formula" className="scroll-mt-24">
          The ranking is done by a published formula, never by the AI. Each score runs from 0 to 1.
        </p>
        <div className="rounded-[12px] border border-border bg-surface p-5">
          <p className="font-mono text-sm sm:text-base">
            anchor = need x verified x ({WEIGHTS.withTrust.trust} trust + {WEIGHTS.withTrust.evidence} evidence + {WEIGHTS.withTrust.feasible} practicality)
          </p>
          <p className="mt-2 font-mono text-sm text-muted">
            without Qloo: need x verified x ({WEIGHTS.offline.evidence} evidence + {WEIGHTS.offline.feasible} practicality)
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            <li><strong>Need:</strong> how high the need is in the place&apos;s zone.</li>
            <li><strong>Trust:</strong> how much the chosen group loves the place, from Qloo.</li>
            <li><strong>Evidence:</strong> 1.0 for barbershops and salons, which were tested in trials; 0.8 for everyday community places such as laundromats and restaurants.</li>
            <li><strong>Practicality:</strong> years in business and the days you prefer.</li>
            <li><strong>Verified:</strong> 1.0 for a licensed business, 0.85 for a place known only to Qloo.</li>
          </ul>
          <p className="mt-3 text-sm text-muted">
            Then diversity rules: at most {WEIGHTS.diversity.perZone} places per zone, no type above half the plan, and at least {WEIGHTS.diversity.minMetres} m between places.
          </p>
        </div>

        <h3 className="pt-2 text-lg font-semibold">The real example: the top 3 places</h3>
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="p-3">Place</th>
                <th scope="col" className="p-3">Need</th>
                <th scope="col" className="p-3">Evidence</th>
                <th scope="col" className="p-3">Practicality</th>
                <th scope="col" className="p-3">Score</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border bg-surface">
              {top.map((v) => (
                <tr key={v.id}>
                  <th scope="row" className="p-3 font-medium">
                    {v.rank}. {v.name}
                    <span className="block font-normal text-muted">{v.category}, {v.city}</span>
                  </th>
                  <td className="p-3">{v.scores.need.toFixed(2)}</td>
                  <td className="p-3">{v.scores.evidence.toFixed(2)}</td>
                  <td className="p-3">{v.scores.feasible.toFixed(2)}</td>
                  <td className="p-3 font-semibold">{v.scores.anchor.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">
          Check one by hand: {top[0].scores.need.toFixed(3)} x 1.0 x ({WEIGHTS.offline.evidence} x {top[0].scores.evidence.toFixed(2)} + {WEIGHTS.offline.feasible} x {top[0].scores.feasible.toFixed(3)}) ={" "}
          {(top[0].scores.need * (WEIGHTS.offline.evidence * top[0].scores.evidence + WEIGHTS.offline.feasible * top[0].scores.feasible)).toFixed(3)}.
        </p>
        <p>
          Finally Anchor builds a visit schedule and records every step in an evidence log. Changing any record breaks the chain, so edits can be detected.{" "}
          <Link href="/app" className="text-accent underline underline-offset-4">Make your own plan</Link>
        </p>
      </Step>
    </div>
  );
}
