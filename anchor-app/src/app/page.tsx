import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Code2,
  Gavel,
  HeartHandshake,
  MapPinned,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Info } from "@/components/Info";
import { Faq } from "@/components/Faq";
import { NeedLegend, NeedMap } from "@/components/NeedMap";
import { FAQ, REFERENCES, VOICES } from "@/content/landing";
import type { InfoId } from "@/content/info";
import { loadNeed } from "@/lib/need";
import { dec, loadResults, pct } from "@/lib/results";

const fmt = new Intl.NumberFormat("en-US");

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-[1200px] px-4 pt-20 sm:px-6 sm:pt-28">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</p> : null}
      <h2 id={`${id}-title`} className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      {intro ? <div className="mt-4 max-w-2xl text-lg text-muted">{intro}</div> : null}
      <div className="mt-10">{children}</div>
    </section>
  );
}

function StatCard({ value, meaning, source, info }: { value: string; meaning: string; source: string; info: InfoId }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between">
        <p className="tabular text-4xl font-semibold tracking-tight text-text sm:text-5xl">{value}</p>
        <Info id={info} className="-mr-2 -mt-2" />
      </div>
      <p className="mt-3 text-[1.0625rem]">{meaning}</p>
      <p className="mt-3 text-sm text-muted">Source: {source}</p>
    </div>
  );
}

const IMPACT_BAND: { big: string; label: string; note: string; info: InfoId }[] = [
  {
    big: "5.4x",
    label: "more men reached a healthy blood pressure",
    note: "63.6% vs 11.7%, when care came to their barbershop. NEJM, 2018.",
    info: "impact-5x",
  },
  {
    big: "About half",
    label: "the strokes, if that drop lasts",
    note: "Our estimate from 123 trials (The Lancet, 2016). Also about a quarter fewer deaths.",
    info: "impact-strokes",
  },
  {
    big: "684,000",
    label: "untreated adults in one county",
    note: "Los Angeles County, from CDC estimates for all 2,474 neighbourhoods.",
    info: "impact-untreated-la",
  },
  {
    big: "894",
    label: "barbershops and salons ready to partner",
    note: "Licensed inside the 20 highest-need zones of Los Angeles alone.",
    info: "impact-venues",
  },
];

const IMPACT_CHAIN: { title: string; big: string; body: string; info: InfoId }[] = [
  {
    title: "It works",
    big: "5.4x",
    body: "More men reached a healthy blood pressure when pharmacists met them in their barbershop.",
    info: "impact-5x",
  },
  {
    title: "It saves lives",
    big: "About half",
    body: "Of strokes could be prevented by a drop that size, if it lasts. Also fewer heart attacks and deaths.",
    info: "impact-strokes",
  },
  {
    title: "It is stuck",
    big: "1 city",
    body: "The programme has not spread beyond the original study. Every new place must work out which local businesses to partner with, and the right places differ by community.",
    info: "impact-stuck",
  },
  {
    title: "Anchor unlocks it",
    big: "Any county",
    body: "Anchor finds where need is highest and which local places people there love, in minutes, for any age group. Live for Los Angeles and San Francisco; need data covers every US county.",
    info: "impact-preferences",
  },
];

const OUTCOMES = [
  { outcome: "Strokes", change: "About 49% fewer" },
  { outcome: "Heart failure", change: "About 51% fewer" },
  { outcome: "Major heart and blood vessel events (including heart attacks)", change: "About 38% fewer" },
  { outcome: "Coronary heart disease events", change: "About 33% fewer" },
  { outcome: "Deaths from any cause", change: "About 26% fewer" },
];

const STEPS:{ title: string; body: string; info: InfoId; Icon: typeof Users }[] = [
  {
    title: "Tell it who and where",
    body: "Choose a goal (like free blood pressure checks), an age group and a county.",
    info: "step-who-where",
    Icon: Users,
  },
  {
    title: "It finds the need",
    body: "CDC data shows the neighbourhoods where the most adults have high blood pressure and no medicine.",
    info: "step-need",
    Icon: MapPinned,
  },
  {
    title: "It finds the trust",
    body: "Barbershops and salons from city records, plus the local places that age group loves most, from Qloo: bakeries, taquerias, markets, parks.",
    info: "step-trust",
    Icon: HeartHandshake,
  },
  {
    title: "It checks and plans",
    body: "Every place is checked against city business records or Qloo's listings, ranked by a clear formula, and turned into a visit schedule, owner invitations and files.",
    info: "step-plan",
    Icon: CalendarCheck,
  },
];

const COMPARE: { aiAlone: string; anchor: string }[] = [
  {
    aiAlone: "Suggests \"local barbershops, churches and community centres\", with no names, or names that may not exist.",
    anchor: "Names specific places, each confirmed on a public map and inside a high-need neighbourhood.",
  },
  {
    aiAlone: "Has no idea which neighbourhoods need it most.",
    anchor: "Uses CDC estimates for every one of the county's neighbourhoods.",
  },
  {
    aiAlone: "Guesses what people like from stereotypes.",
    anchor: "Uses Qloo data on what this exact age group loves, place by place. Men and women aged 35 to 54 got completely different lists.",
  },
  {
    aiAlone: "Cannot show its evidence.",
    anchor: "Every place has a plain reason and the exact data behind it.",
  },
];

const AUDIENCES = [
  {
    title: "Health workers",
    body: "Get a short list of places to visit, the best days to go and what to say. Works on your phone.",
    href: "/app",
    cta: "Try the demo",
    Icon: Stethoscope,
  },
  {
    title: "Health departments and health plans",
    body: "See need and trust on one map. Upload your current partners to see which ones reach high-need neighbourhoods. Export to spreadsheets, map tools and calendars.",
    href: "/app",
    cta: "Open the app",
    Icon: Building2,
  },
  {
    title: "Developers and AI agents",
    body: "Use Anchor from your own software with the API, or from Claude and other AI assistants with MCP.",
    href: "/developers",
    cta: "Developer docs",
    Icon: Code2,
  },
  {
    title: "Judges",
    body: "A 3-minute tour of what we built, how it uses Qloo and how to check every claim yourself.",
    href: "/judges",
    cta: "Judge mode",
    Icon: Gavel,
  },
];

const WAYS: { title: string; simple: string; technical: string; info?: InfoId }[] = [
  { title: "Web app", simple: "Use it in your browser. No sign-up.", technical: "Next.js app, works on phones and desktops, light and dark." },
  {
    title: "Bring your own data",
    simple: "Upload the places you already work with. Anchor checks each one against need and puts those in high-need neighbourhoods first. Files about people are refused.",
    technical: "CSV with name, latitude, longitude and optional type (up to 200 rows), parsed in the browser, then sent as PlanRequest.partners. Columns about people are refused. No geocoding.",
    info: "use-byod",
  },
  {
    title: "API",
    simple: "Let your software ask Anchor for plans automatically.",
    technical: "REST with OpenAPI 3.1. POST /api/v1/plans with a Bearer key. Demo key: anc_demo.",
    info: "use-api",
  },
  {
    title: "AI assistants (MCP)",
    simple: "Let Claude and other AI assistants use Anchor as a tool.",
    technical: "Remote MCP server at /api/mcp. Tools: anchor_need_map, anchor_find_venues, anchor_plan_outreach, anchor_export.",
    info: "use-mcp",
  },
  {
    title: "Your own Qloo key",
    simple: "Use your own Qloo account for heavy use.",
    technical: "Send X-Qloo-Key with a request. It is used once and never stored or logged.",
    info: "use-byok",
  },
];


export default async function Home() {
  const [{ summary, zones, focus }, results] = await Promise.all([loadNeed("06037"), loadResults()]);
  const sys = results.systems;
  const proofRows: { label: string; cells: string[] }[] = [
    { label: "Places in the highest-need fifth of neighbourhoods", cells: [pct(sys.anchor.needCapture), pct(sys.aiOnly.needCapture), pct(sys.qlooNoNeed.needCapture), pct(sys.mapSearch.needCapture)] },
    { label: "Average need of those neighbourhoods (0 to 1)", cells: [dec(sys.anchor.meanNeedPercentile), dec(sys.aiOnly.meanNeedPercentile), dec(sys.qlooNoNeed.meanNeedPercentile), dec(sys.mapSearch.meanNeedPercentile)] },
    { label: "Places shared between two audiences (lower is more tailored)", cells: [pct(results.qloo?.meanAudienceOverlap ?? undefined), pct(results.qloo?.aiAudienceOverlap ?? undefined), "n/a", "Same list for everyone"] },
    { label: "Bars, liquor stores and similar", cells: [pct(sys.anchor.unsuitableRate), pct(sys.aiOnly.unsuitableRate), pct(sys.qlooNoNeed.unsuitableRate), pct(sys.mapSearchAny.unsuitableRate)] },
    { label: "Places confirmed in a licence or Qloo listing", cells: [pct(sys.anchor.licensedRate), pct(sys.aiOnly.licensedRate), pct(sys.qlooNoNeed.licensedRate), pct(sys.mapSearch.licensedRate)] },
  ];
  const top = zones.slice(0, 10);

  return (
    <>
      {/* 1. Hero */}
      <section aria-labelledby="hero-title" className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Public health outreach, powered by taste data
            </p>
            <h1 id="hero-title" className="mt-3 text-[2.25rem] font-semibold leading-[1.1] sm:text-[3.25rem]">
              Find the barbershops of every community.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
              Anchor shows health workers where high blood pressure goes untreated, and which local places people
              there already love and trust, so free health checks happen where people actually are.
            </p>
            <p className="mt-4 max-w-xl border-l-4 border-accent pl-4 text-[1.0625rem]">
              When pharmacists came to the barbershop, <strong>5 times as many men</strong> got their blood pressure under
              control. Anchor finds the right places to do that in every community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 text-base font-semibold text-accent-contrast hover:opacity-90"
              >
                Try the live demo <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link
                href="#how"
                className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-border px-6 text-base font-medium hover:bg-surface-2"
              >
                See how it works (60 sec)
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted">
              Built on Qloo&apos;s taste data, CDC public health data and a landmark study in the New England Journal of
              Medicine. Free and open source.
              <Info id="hero-qloo" className="-my-3" />
            </p>
          </div>
          <figure className="overflow-hidden rounded-[16px] border border-border bg-bg shadow-card">
            <NeedMap focus={focus} titleId="hero-map-title" descId="hero-map-desc" />
            <figcaption className="border-t border-border p-4 text-sm text-muted">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span id="hero-map-title" className="font-medium text-text">
                  Central and South Los Angeles: where high blood pressure most often goes untreated
                </span>
                <NeedLegend />
              </div>
              <span id="hero-map-desc">
                Blue areas are neighbourhoods in the county&apos;s highest-need fifth. Numbers mark the 10 zones with the
                most adults who have high blood pressure and no medicine. Real CDC data.{" "}
                <a href="#example" className="text-accent underline underline-offset-4">See the list</a>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 1b. Impact band: the strongest numbers, right under the hero */}
      <section aria-label="Impact in numbers" className="border-b border-border bg-bg">
        <ul className="mx-auto grid max-w-[1200px] gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {IMPACT_BAND.map((s) => (
            <li key={s.info} className="flex flex-col bg-bg px-5 py-6 sm:px-6">
              <div className="flex items-start justify-between gap-2">
                <p className="tabular text-3xl font-semibold tracking-tight text-accent sm:text-[2.125rem]">{s.big}</p>
                <Info id={s.info} className="-mr-3 -mt-2" />
              </div>
              <p className="mt-1 font-medium">{s.label}</p>
              <p className="mt-1 text-sm text-muted">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Problem */}
      <Section
        id="problem"
        eyebrow="The problem"
        title="Blood pressure medicine works. It is just not reaching people."
        intro="High blood pressure usually has no symptoms, so people who feel fine do not come in. Care has to go to them."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <StatCard value="120 million" meaning="US adults with high blood pressure, about half of all adults." source="CDC" info="stat-120m" />
          <StatCard value="1 in 4" meaning="Of them have it under control." source="CDC" info="stat-1in4" />
          <StatCard value="680,179" meaning="Deaths in 2024 where high blood pressure was a cause." source="CDC" info="stat-deaths" />
        </div>
      </Section>

      {/* 3. Research */}
      <Section id="study" eyebrow="The research" title="What happened when health care went to the barbershop">
        <article className="grid gap-8 rounded-[16px] border border-border bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_auto]">
          <dl className="grid gap-5 text-[1.0625rem] sm:grid-cols-2">
            <div>
              <dt className="font-semibold">The question</dt>
              <dd className="mt-1 text-muted">Can barbershops help men get high blood pressure under control?</dd>
            </div>
            <div>
              <dt className="font-semibold">What they did</dt>
              <dd className="mt-1 text-muted">
                52 barbershops in Los Angeles were split into two groups by chance. In one group, barbers encouraged
                customers to meet a pharmacist right there in the shop.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">What it means for Anchor</dt>
              <dd className="mt-1 text-muted">
                Going to trusted places works. But every community has its own trusted places, and nobody has a map of
                them. Anchor makes that map.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">The study</dt>
              <dd className="mt-1 text-muted">
                Victor et al., New England Journal of Medicine, 2018.{" "}
                <a className="text-accent underline underline-offset-4" href={REFERENCES[0].href}>
                  Read it
                </a>
              </dd>
            </div>
          </dl>
          <div className="flex flex-col justify-center rounded-[12px] bg-accent-soft p-6 text-center lg:w-72">
            <p className="text-sm font-medium">Men who reached a healthy blood pressure</p>
            <p className="tabular mt-3 text-5xl font-semibold text-accent">63.6%</p>
            <p className="text-sm text-muted">with a pharmacist in the barbershop</p>
            <p className="tabular mt-4 text-3xl font-semibold">11.7%</p>
            <p className="text-sm text-muted">with the usual advice</p>
            <div className="mt-2 flex justify-center">
              <Info id="study-card" />
            </div>
          </div>
        </article>
      </Section>

      {/* 3b. Impact */}
      <Section
        id="impact"
        eyebrow="The impact"
        title="A proven way to prevent strokes is stuck in one city. Anchor tells you where to take it next."
      >
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {IMPACT_CHAIN.map((c, i) => (
            <li key={c.title} className="flex flex-col rounded-[12px] border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted">{i + 1}</span>
                <Info id={c.info} className="-my-2 -mr-2" />
              </div>
              <h3 className="mt-2 text-lg font-semibold">{c.title}</h3>
              <p className="tabular mt-3 text-3xl font-semibold text-accent">{c.big}</p>
              <p className="mt-2 flex-1 text-muted">{c.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 overflow-hidden rounded-[12px] border border-border">
          <table className="w-full border-collapse text-left">
            <caption className="bg-surface-2 px-4 py-3 text-left font-semibold">
              <span className="inline-flex flex-wrap items-center">
                If the barbershop study&apos;s blood pressure drop lasted over time (estimate)
                <Info id="impact-strokes" />
              </span>
            </caption>
            <thead className="bg-surface text-sm text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Outcome</th>
                <th scope="col" className="px-4 py-2 font-medium">Expected change</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border bg-surface">
              {OUTCOMES.map((o) => (
                <tr key={o.outcome}>
                  <th scope="row" className="px-4 py-3 font-normal">{o.outcome}</th>
                  <td className="px-4 py-3 font-semibold">{o.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border bg-surface px-4 py-3 text-sm text-muted">
            How we got these: the 21.6-point drop measured in the barbershop study, combined with a review of 123 trials
            and 613,815 people that measured what each 10-point drop prevents (Ettehad et al., The Lancet, 2016). These
            are estimates, not results from Anchor. Anchor&apos;s part is getting the programme to the right places.
          </p>
        </div>
      </Section>

      {/* 3c. Voices from the field (published research) */}
      <Section
        id="voices"
        eyebrow="Voices from the field"
        title="What the people who do this work have told researchers"
        intro="From published studies, quoted exactly and cited. We read these before designing Anchor."
      >
        <ul className="grid gap-5 md:grid-cols-3">
          {VOICES.map((v) => (
            <li key={v.source} className="flex flex-col rounded-[12px] border border-border bg-surface p-6">
              <p className="text-sm font-semibold text-muted">{v.who}</p>
              {v.quote ? <blockquote className="mt-3 border-l-4 border-accent pl-3 text-lg">&ldquo;{v.quote}&rdquo;</blockquote> : null}
              <p className="mt-3 flex-1 text-muted">{v.finding}</p>
              <a href={v.href} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4">
                {v.source}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. How it works */}
      <Section id="how" eyebrow="How it works" title="How Anchor builds a plan, in 4 steps">
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-[12px] border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                  <step.Icon aria-hidden="true" size={20} />
                </span>
                <Info id={step.info} className="-mr-2" />
              </div>
              <p className="mt-4 text-sm font-semibold text-muted">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5. Why Qloo */}
      <Section
        id="why-qloo"
        eyebrow="Why Qloo, and not just AI"
        title="The same question, two answers"
        intro={
          <p className="flex flex-wrap items-center">
            &ldquo;Where should we hold free blood pressure checks for men aged 35 to 54 in South Los Angeles?&rdquo;
            <Info id="why-qloo" />
          </p>
        }
      >
        <div className="overflow-hidden rounded-[12px] border border-border">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">How an AI chatbot alone compares with Anchor on the same request</caption>
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="w-1/2 p-4 font-semibold">AI alone</th>
                <th scope="col" className="w-1/2 p-4 font-semibold text-accent">Anchor with Qloo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {COMPARE.map((row) => (
                <tr key={row.anchor}>
                  <td className="p-4 align-top text-muted">{row.aiAlone}</td>
                  <td className="p-4 align-top">{row.anchor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          This comparison describes the expected behaviour. Our logged side-by-side run will replace it with real answers
          before submission.
        </p>
      </Section>

      {/* 6. See it work: real need data */}
      <Section
        id="example"
        eyebrow="See it work"
        title="The need layer for Los Angeles County, built from real CDC data"
        intro={
          <p>
            Across {fmt.format(summary.tracts)} neighbourhoods, CDC estimates point to about{" "}
            <strong className="text-text">{fmt.format(summary.estUntreatedAdults)}</strong> adults with high blood
            pressure who are not taking medicine for it. Anchor grouped the highest-need fifth into{" "}
            {fmt.format(summary.zones)} zones, home to about {fmt.format(summary.zoneEstUntreatedAdults)} of them.
          </p>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
          <ol className="space-y-4">
            {[
              { n: fmt.format(summary.tracts), t: "neighbourhoods scored", d: "Every census tract in Los Angeles County with CDC data." },
              { n: fmt.format(summary.zones), t: "high-need zones", d: "The top fifth of neighbourhoods, grouped into areas one outreach team can cover." },
              { n: `${fmt.format(zones.slice(0, 20).reduce((s, z) => s + z.estUntreatedAdults, 0))}`, t: "untreated adults in the top 20 zones", d: "Where a first plan would start. Most are in South Los Angeles, where the barbershop study ran." },
            ].map((s) => (
              <li key={s.t} className="rounded-[12px] border border-border bg-surface p-5">
                <p className="tabular text-3xl font-semibold">{s.n}</p>
                <p className="font-medium">{s.t}</p>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="rounded-[12px] border border-border bg-surface">
            <table className="w-full text-left text-[0.9375rem]">
              <caption className="flex flex-wrap items-center justify-between gap-x-3 px-3 pt-3 text-left font-semibold sm:px-4">
                Top 10 zones
                <span className="flex items-center text-sm font-normal text-muted">
                  What is a zone? <Info id="zones" />
                </span>
              </caption>
              <thead>
                <tr className="border-b border-border text-sm text-muted">
                  <th scope="col" className="px-3 py-2 sm:px-4 font-medium">Rank</th>
                  <th scope="col" className="px-3 py-2 sm:px-4 font-medium">
                    <span className="inline-flex items-center">
                      Untreated adults <Info id="untreated" />
                    </span>
                  </th>
                  <th scope="col" className="px-3 py-2 sm:px-4 font-medium">Area</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {top.map((z, i) => (
                  <tr key={z.zoneId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 sm:px-4">{i + 1}</td>
                    <td className="px-3 py-2 sm:px-4">about {fmt.format(z.estUntreatedAdults)}</td>
                    <td className="px-3 py-2 sm:px-4">{z.areaKm2} sq km</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-sm text-muted">
              Next, Anchor asks Qloo which places people love inside each zone. That step needs our Qloo API key and
              appears here once it is live.
            </p>
            <div className="layer-technical border-t border-border px-4 py-3 font-mono text-[0.8125rem] text-muted">
              {summary.method}. Source: {summary.source}. Largest zone outline: {summary.maxZoneWktBytes} bytes of WKT.
            </div>
          </div>
        </div>
      </Section>

      {/* 7. Proof */}
      <Section
        id="proof"
        eyebrow="Proof"
        title="We test it against the obvious alternatives"
        intro={`Measured on ${results.requests} plan requests in Los Angeles County, using only public data. Rerun it yourself with one command.`}
      >
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { big: pct(sys.anchor.unsuitableRate), label: "bars or liquor stores in Anchor's plans", sub: `A search of local businesses: ${pct(sys.mapSearchAny.unsuitableRate)}` },
            { big: `${results.policy.targeting.passed} of ${results.policy.targeting.total}`, label: "race or religion targeting requests planned by need instead", sub: `${results.policy.controls.passed} of ${results.policy.controls.total} look-alike ordinary requests left alone` },
            { big: pct(sys.anchor.licensedRate), label: "of places confirmed in a city licence or a Qloo listing", sub: `AI alone: ${pct(sys.aiOnly.licensedRate)} could be confirmed` },
          ].map((c) => (
            <div key={c.label} className="flex gap-3 rounded-[12px] border border-border bg-surface p-5">
              <ShieldCheck aria-hidden="true" className="mt-1 shrink-0 text-success" />
              <div>
                <p className="tabular text-2xl font-semibold">{c.big}</p>
                <p>{c.label}</p>
                <p className="mt-1 text-sm text-muted">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <caption className="sr-only">Anchor compared with AI alone, Qloo alone and a map search</caption>
            <thead className="bg-surface-2 text-sm">
              <tr>
                <th scope="col" className="p-4 font-semibold">Measure</th>
                <th scope="col" className="p-4 font-semibold text-accent">Anchor</th>
                <th scope="col" className="p-4 font-semibold">AI alone (same model, no data)</th>
                <th scope="col" className="p-4 font-semibold">Qloo alone, without need data</th>
                <th scope="col" className="p-4 font-semibold">
                  <span className="inline-flex items-center">
                    Map search for barbershops <Info id="proof-baselines" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-border bg-surface">
              {proofRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="p-4 font-normal">{row.label}</th>
                  {row.cells.map((c, i) => (
                    <td key={i} className={`p-4 ${i === 0 ? "font-semibold" : "text-muted"}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          AI alone is the same model Anchor&apos;s agent uses, asked the same question with no tools or data. It mostly names famous churches, parks and libraries, and gives every audience a similar list.{" "}
          <Link href="/proof" className="text-accent underline underline-offset-4">See the full method, every test and the honesty notes</Link>
        </p>
      </Section>

      {/* 8. Who it is for */}
      <Section id="who" eyebrow="Who it is for" title="Start where you are">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="flex flex-col rounded-[12px] border border-border bg-surface p-6">
              <a.Icon aria-hidden="true" className="text-accent" size={24} />
              <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
              <p className="mt-2 flex-1 text-muted">{a.body}</p>
              <Link href={a.href} className="mt-4 inline-flex min-h-11 items-center gap-1 font-medium text-accent">
                {a.cta} <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. Use it your way */}
      <Section
        id="ways"
        eyebrow="Use it your way"
        title="An app, an API, and a tool for AI assistants"
        intro="Not a developer? You only need the web app. Switch to Technical in the header to see the details for each option."
      >
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {WAYS.map((w) => (
            <li key={w.title} className="rounded-[12px] border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{w.title}</h3>
                {w.info ? <Info id={w.info} className="-my-2 -mr-2" /> : null}
              </div>
              <p className="mt-2 text-muted">{w.simple}</p>
              <p className="layer-technical mt-3 rounded-[8px] bg-surface-2 p-3 font-mono text-[0.8125rem]">{w.technical}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 10. Safety and limits */}
      <Section id="safety" eyebrow="Safety and limits" title="What Anchor does and does not do">
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            { t: "It never targets people by race, ethnicity or religion.", b: "It plans by neighbourhood need, age and gender only. We test this with 30 tricky requests and publish the result.", info: "race-policy" as InfoId },
            { t: "It uses no personal data.", b: "No patient records, no names, no tracking." },
            { t: "It does not give medical advice.", b: "Health wording comes from public health sources, and a person must review every flyer before it is shared." },
            { t: "Its numbers are estimates.", b: "CDC neighbourhood figures come from a national survey and statistical models. Qloo shows what groups of people love, not how many walk through a door.", info: "estimates" as InfoId },
          ].map((item) => (
            <li key={item.t} className="rounded-[12px] border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.t}</p>
                {item.info ? <Info id={item.info} className="-my-2 -mr-2" /> : null}
              </div>
              <p className="mt-2 text-muted">{item.b}</p>
            </li>
          ))}
        </ul>
        <Link href="/safety" className="mt-4 inline-flex min-h-11 items-center gap-1 font-medium text-accent">
          Read the full safety page <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </Section>

      {/* 11. FAQ */}
      <Section id="faq" eyebrow="Questions" title="Frequently asked questions">
        <Faq items={FAQ} />
      </Section>

      {/* 12. References */}
      <Section id="references" eyebrow="References" title="Sources">
        <ol className="list-decimal space-y-2 pl-6 text-muted">
          {REFERENCES.map((r) => (
            <li key={r.id}>
              {r.text}{" "}
              <a href={r.href} className="break-all text-accent underline underline-offset-4">
                {r.href.replace("https://", "")}
              </a>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
