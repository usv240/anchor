import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Info } from "@/components/Info";
import { Faq } from "@/components/Faq";
import { QuickTry } from "@/components/QuickTry";
import { CreateKey } from "@/components/CreateKey";
import { DeepDive, type DeepDivePanel } from "@/components/DeepDive";
import { NeedLegend, NeedMap } from "@/components/NeedMap";
import { FAQ, REFERENCES } from "@/content/landing";
import { PHOTOS } from "@/content/photos";
import { examplePlan } from "@/lib/example";
import type { InfoId } from "@/content/info";
import { loadNeed } from "@/lib/need";
import { dec, loadResults, pct } from "@/lib/results";

const fmt = new Intl.NumberFormat("en-US");

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-16 sm:px-6 sm:pt-24">
      <h2 id={`${id}-title`} data-reveal className="max-w-[28ch] text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
        {title}
      </h2>
      {intro ? (
        <div data-reveal style={delay(80)} className="mt-3 max-w-[64ch] text-muted">
          {intro}
        </div>
      ) : null}
      <div data-reveal style={delay(160)} className="mt-7">
        {children}
      </div>
    </section>
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

const OUTCOMES = [
  { outcome: "Strokes", change: "About 49% fewer" },
  { outcome: "Heart failure", change: "About 51% fewer" },
  { outcome: "Major heart and blood vessel events (including heart attacks)", change: "About 38% fewer" },
  { outcome: "Coronary heart disease events", change: "About 33% fewer" },
  { outcome: "Deaths from any cause", change: "About 26% fewer" },
];

const STEPS: { title: string; body: string; info: InfoId }[] = [
  {
    title: "Tell it who and where",
    body: "Choose a goal (like free blood pressure checks), an age group and a county.",
    info: "step-who-where",
  },
  {
    title: "It finds the need",
    body: "CDC data shows the neighbourhoods where the most adults have high blood pressure and no medicine.",
    info: "step-need",
  },
  {
    title: "It finds the trust",
    body: "Barbershops and salons from city records, plus the local places that age group loves most, from Qloo: bakeries, taquerias, markets, parks.",
    info: "step-trust",
  },
  {
    title: "It checks and plans",
    body: "Every place is checked against city business records or Qloo's listings, ranked by a clear formula, and turned into a visit schedule, owner invitations and files.",
    info: "step-plan",
  },
];

const AUDIENCES = [
  {
    title: "Health workers",
    body: "Get a short list of places to visit, the best days to go and what to say. Works on your phone.",
    href: "/app",
    cta: "Try the demo",
  },
  {
    title: "Health departments and health plans",
    body: "See need and trust on one map. Upload your current partners to see which ones reach high-need neighbourhoods. Export to spreadsheets, map tools and calendars.",
    href: "/app",
    cta: "Open the app",
  },
  {
    title: "Developers and AI agents",
    body: "Use Anchor from your own software with the API, or from Claude and other AI assistants with MCP.",
    href: "/developers",
    cta: "Developer docs",
  },
  {
    title: "Judges",
    body: "A 3-minute tour of what we built, how it uses Qloo and how to check every claim yourself.",
    href: "/judges",
    cta: "Judge mode",
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
  const example = await examplePlan();
  const compare: { aiAlone: string; anchor: string }[] = [
    {
      aiAlone: `Names well-known places, mostly churches, parks, libraries and malls. Only ${pct(sys.aiOnly.licensedRate)} could be found in a city record or Qloo's listings.`,
      anchor: `Names specific local places, ${pct(sys.anchor.licensedRate)} confirmed in a city business record or a Qloo listing.`,
    },
    {
      aiAlone: `${pct(sys.aiOnly.needCapture)} of its places are in the neighbourhoods that need checks most.`,
      anchor: `${pct(sys.anchor.needCapture)} are, because it starts from CDC estimates for every neighbourhood.`,
    },
    {
      aiAlone: `Gives different audiences similar lists (${pct(results.qloo?.aiAudienceOverlap ?? undefined)} of places shared).`,
      anchor: `Uses Qloo data on what each age group loves, place by place (${pct(results.qloo?.meanAudienceOverlap ?? undefined)} shared). Men and women aged 35 to 54 got no place in common.`,
    },
    {
      aiAlone: "Cannot show its evidence.",
      anchor: "Every place has a plain reason and a record of the data behind it.",
    },
  ];

  const h2 = "text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.02em]";

  const learn: DeepDivePanel[] = [
    {
      id: "research",
      label: "The research",
      aliases: ["problem", "study", "impact", "voices"],
      content: (
        <div className="space-y-5">
          <article className="grid gap-6 rounded-[16px] bg-panel p-6 sm:grid-cols-[13rem_1fr] sm:p-8 lg:grid-cols-[13rem_1fr_15rem]">
            <div className="flex flex-col justify-center rounded-[12px] bg-accent-soft p-5 text-center">
              <p className="tabular text-5xl font-semibold text-accent">63.6%</p>
              <p className="text-sm">of men reached a healthy blood pressure with a pharmacist in the barbershop</p>
              <p className="tabular mt-4 text-3xl font-semibold">11.7%</p>
              <p className="text-sm text-muted">with the usual advice</p>
              <div className="mt-2 flex justify-center">
                <Info id="study-card" />
              </div>
            </div>
            <dl className="space-y-4 self-center">
              <div>
                <dt className="font-semibold">What they did</dt>
                <dd className="mt-1 text-muted">
                  52 Los Angeles barbershops were split into two groups by chance. In one, barbers encouraged customers to meet
                  a pharmacist right there in the shop.
                </dd>
              </div>
              <div>
                <dt className="flex items-center font-semibold">
                  Why it never spread <Info id="impact-stuck" className="-my-2" />
                </dt>
                <dd className="mt-1 text-muted">
                  Every community trusts different places, and nobody has a map of them. Anchor makes that map.
                  <Info id="impact-preferences" className="-my-3 align-middle" />
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
            <Image
              src={PHOTOS.pole.src}
              width={PHOTOS.pole.width}
              height={PHOTOS.pole.height}
              alt={PHOTOS.pole.alt}
              sizes="240px"
              className="hidden h-full max-h-72 w-full rounded-[12px] object-cover object-[50%_40%] lg:block"
            />
          </article>
          <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { value: "120M", meaning: "US adults with high blood pressure", info: "stat-120m" as InfoId },
                { value: "1 in 4", meaning: "of them have it under control", info: "stat-1in4" as InfoId },
                { value: "680,179", meaning: "deaths in 2024 where it was a cause", info: "stat-deaths" as InfoId },
              ].map((x) => (
                <div key={x.value}>
                  <dt className="flex items-center">
                    <span className="tabular text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{x.value}</span>
                    <Info id={x.info} className="-my-2" />
                  </dt>
                  <dd className="mt-1 text-sm">{x.meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted">Source for all three: Centers for Disease Control and Prevention.</p>
            <Link href="/research" className="mt-2 inline-flex min-h-11 items-center gap-1 font-medium text-accent">
              The full research: interviews, method and sources <ArrowRight aria-hidden="true" size={16} />
            </Link>
            </div>
            <div className="rounded-[12px] bg-panel p-5">
              <p className="flex items-center font-semibold">
                If that drop lasted, an estimate <Info id="impact-strokes" className="-my-2" />
              </p>
              <ul className="tabular mt-2 space-y-1 text-sm">
                {OUTCOMES.map((o) => (
                  <li key={o.outcome} className="flex justify-between gap-3">
                    <span className="text-muted">{o.outcome}</span>
                    <span className="shrink-0 font-semibold">{o.change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "how",
      label: "How it works",
      aliases: ["why-qloo", "steps"],
      content: (
        <>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[12px] bg-panel p-5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold">
                    <span className="tabular mr-2 text-accent">{i + 1}</span>
                    {step.title}
                  </h4>
                  <Info id={step.info} className="-mr-2 -mt-2" />
                </div>
                <p className="mt-2 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 overflow-hidden rounded-[12px] bg-panel">
            <p className="flex flex-wrap items-center px-4 pt-4 font-semibold">
              Why Qloo, and not just AI <Info id="why-qloo" className="-my-2" />
            </p>
            <p className="px-4 pb-3 text-sm text-muted">
              Same question to both: &ldquo;Where should we hold free blood pressure checks for men aged 35 to 54 in South Los Angeles?&rdquo;
            </p>
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">How an AI chatbot alone compares with Anchor on the same request</caption>
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="w-1/2 px-4 py-3 font-semibold">AI alone</th>
                  <th scope="col" className="w-1/2 px-4 py-3 font-semibold text-accent">Anchor with Qloo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compare.map((row) => (
                  <tr key={row.anchor}>
                    <td className="px-4 py-3 align-top text-muted">{row.aiAlone}</td>
                    <td className="px-4 py-3 align-top">{row.anchor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            Measured with the same model Anchor&apos;s agent uses, asked with no tools, across {results.requests} requests.{" "}
            <Link href="/how-it-works" className="text-accent underline underline-offset-4">Every step and the ranking formula</Link>
          </p>
        </>
      ),
    },
    {
      id: "need",
      label: "Where the need is",
      aliases: ["example", "map"],
      content: (
        <>
          <p className="max-w-[70ch] text-[1.0625rem]">
            Across {fmt.format(summary.tracts)} Los Angeles neighbourhoods, CDC estimates point to about{" "}
            <strong>{fmt.format(summary.estUntreatedAdults)}</strong> adults with high blood pressure who take no medicine for
            it. Anchor grouped the highest-need fifth into {fmt.format(summary.zones)} zones, home to about{" "}
            {fmt.format(summary.zoneEstUntreatedAdults)} of them.
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
            <figure className="overflow-hidden rounded-[16px] bg-panel">
              <NeedMap focus={focus} titleId="need-map-title" descId="need-map-desc" />
              <figcaption className="p-4 text-sm text-muted">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span id="need-map-title" className="font-medium text-text">
                    Central and South Los Angeles
                  </span>
                  <NeedLegend />
                </div>
                <span id="need-map-desc">
                  Blue areas are in the county&apos;s highest-need fifth. Numbers mark the 10 zones with the most adults who have
                  high blood pressure and no medicine.
                </span>
              </figcaption>
            </figure>
            <div className="rounded-[12px] bg-panel">
              <table className="w-full text-left text-[0.9375rem]">
                <caption className="flex flex-wrap items-center justify-between gap-x-3 px-3 pt-3 text-left font-semibold sm:px-4">
                  Top 10 zones
                  <span className="flex items-center text-sm font-normal text-muted">
                    What is a zone? <Info id="zones" />
                  </span>
                </caption>
                <thead>
                  <tr className="border-b border-border text-sm text-muted">
                    <th scope="col" className="px-3 py-2 font-medium sm:px-4">Rank</th>
                    <th scope="col" className="px-3 py-2 font-medium sm:px-4">
                      <span className="inline-flex items-center">
                        Untreated adults <Info id="untreated" />
                      </span>
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium sm:px-4">Area</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {top.map((z, i) => (
                    <tr key={z.zoneId} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 sm:px-4">{i + 1}</td>
                      <td className="px-3 py-1.5 sm:px-4">about {fmt.format(z.estUntreatedAdults)}</td>
                      <td className="px-3 py-1.5 sm:px-4">{z.areaKm2} sq km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-sm text-muted">Next, Anchor asks Qloo which places each audience loves inside these zones.</p>
              <div className="layer-technical border-t border-border px-4 py-3 font-mono text-[0.8125rem] text-muted">
                {summary.method}. Source: {summary.source}. Largest zone outline: {summary.maxZoneWktBytes} bytes of WKT.
              </div>
            </div>
          </div>
        </>
      ),
    },
    {
      id: "proof",
      label: "The proof",
      content: (
        <>
          <p className="max-w-[70ch] text-[1.0625rem]">
            Measured on {results.requests} plan requests in Los Angeles County, using only public data. Anyone can rerun it with one command.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { big: pct(sys.anchor.unsuitableRate), label: "bars or liquor stores in Anchor's plans", sub: `A search of local businesses: ${pct(sys.mapSearchAny.unsuitableRate)}` },
              { big: `${results.policy.targeting.passed} of ${results.policy.targeting.total}`, label: "race or religion targeting requests planned by need instead", sub: `${results.policy.controls.passed} of ${results.policy.controls.total} look-alike ordinary requests left alone` },
              { big: pct(sys.anchor.licensedRate), label: "of places confirmed in a city licence or a Qloo listing", sub: `AI alone: ${pct(sys.aiOnly.licensedRate)} could be confirmed` },
            ].map((c) => (
              <div key={c.label} className="flex gap-3 rounded-[12px] bg-panel p-5">
                <ShieldCheck aria-hidden="true" className="mt-1 shrink-0 text-success" />
                <div>
                  <p className="tabular text-2xl font-semibold">{c.big}</p>
                  <p>{c.label}</p>
                  <p className="mt-1 text-sm text-muted">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-x-auto rounded-[12px] bg-panel">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <caption className="sr-only">Anchor compared with AI alone, Qloo alone and a map search</caption>
              <thead className="bg-surface-2 text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Measure</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-accent">Anchor</th>
                  <th scope="col" className="px-4 py-3 font-semibold">AI alone (same model, no data)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Qloo alone, without need data</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center">
                      Map search for barbershops <Info id="proof-baselines" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-border bg-surface">
                {proofRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-4 py-3 font-normal">{row.label}</th>
                    {row.cells.map((c, i) => (
                      <td key={i} className={`px-4 py-3 ${i === 0 ? "font-semibold" : "text-muted"}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/proof" className="mt-3 inline-flex min-h-11 items-center gap-1 font-medium text-accent">
            The full method, every test and the honesty notes <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </>
      ),
    },
    {
      id: "safety",
      label: "Safety and limits",
      content: (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {[
              { t: "It never targets people by race, ethnicity or religion.", b: "It plans by neighbourhood need, age and gender only. We test this with 20 tricky requests, plus 5 ordinary look-alikes it must leave alone, and publish the result.", info: "race-policy" as InfoId },
              { t: "It uses no personal data.", b: "No patient records, no names, no tracking." },
              { t: "It does not give medical advice.", b: "Health wording comes from public health sources, and a person must review every flyer before it is shared." },
              { t: "Its numbers are estimates.", b: "CDC neighbourhood figures come from a national survey and statistical models. Qloo shows what groups of people love, not how many walk through a door.", info: "estimates" as InfoId },
            ].map((item) => (
              <li key={item.t} className="rounded-[12px] bg-panel p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{item.t}</p>
                  {item.info ? <Info id={item.info} className="-my-2 -mr-2" /> : null}
                </div>
                <p className="mt-2 text-muted">{item.b}</p>
              </li>
            ))}
          </ul>
          <Link href="/safety" className="mt-3 inline-flex min-h-11 items-center gap-1 font-medium text-accent">
            Read the full safety page <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </>
      ),
    },
  ];

  return (
    <>
      {/* 1. Hero: what it is, the one number that matters, and two ways in */}
      <section aria-labelledby="hero-title" className="overflow-hidden bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:pb-16">
          <h1 id="hero-title" className="max-w-[18ch] text-[clamp(2rem,6.2vw,4.75rem)] font-semibold leading-[1] tracking-[-0.035em]">
            Find the barbershops of every community.
          </h1>
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] [&>*]:min-w-0">
            <div>
              <p className="max-w-[46ch] text-lg sm:text-xl">
                Anchor shows health workers where high blood pressure goes untreated, and which local places people there
                already love and trust, so free checks happen where people actually are.
              </p>
              <p className="mt-5 text-xl font-semibold leading-snug tracking-[-0.01em] text-accent sm:text-2xl">
                With a pharmacist in the barbershop, 5 times as many men reached a healthy blood pressure.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#try"
                  className="press inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-accent px-6 text-base font-semibold text-accent-contrast hover:opacity-90"
                >
                  Try it right here <ArrowRight aria-hidden="true" size={18} />
                </a>
                <Link
                  href="/judges"
                  className="press inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-[10px] bg-panel px-6 text-base font-medium hover:bg-surface-2"
                >
                  Judge mode (3 minutes)
                </Link>
              </div>
              <p className="mt-5 flex max-w-[52ch] items-start text-sm text-muted">
                <span>
                  Built on Qloo&apos;s taste data, CDC public health data and a landmark study in the New England Journal of
                  Medicine. Free and open source.
                </span>
                <Info id="hero-qloo" className="-my-3 shrink-0" />
              </p>
            </div>
            <figure className="relative">
              <Image
                src={PHOTOS.barber.src}
                width={PHOTOS.barber.width}
                height={PHOTOS.barber.height}
                alt={PHOTOS.barber.alt}
                priority
                sizes="(min-width: 1024px) 640px, 100vw"
                className="aspect-[3/2] w-full rounded-[16px] object-cover"
              />
              <div className="relative -mt-16 ml-4 mr-4 rounded-[14px] bg-bg p-4 sm:ml-8 sm:w-[22rem] lg:absolute lg:-bottom-10 lg:-left-10 lg:m-0">
                <p className="flex items-center justify-between text-sm font-semibold">
                  A real plan: men aged 35 to 54, Los Angeles
                  <Info id="hero-plan" className="-my-3 -mr-3" />
                </p>
                <ol className="mt-2 space-y-1.5 text-sm">
                  {example.venues.slice(0, 4).map((v) => (
                    <li key={v.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate">
                        <span className="tabular mr-2 text-muted">{v.rank}</span>
                        {v.name}
                        <span className="text-muted"> &middot; {v.category}</span>
                      </span>
                      <span className="tabular shrink-0 font-semibold text-accent">{v.scores.anchor.toFixed(2)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* 1b. The strongest numbers, in one row */}
      <section aria-label="Impact in numbers" className="bg-panel">
        <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {IMPACT_BAND.map((s, i) => (
            <li key={s.info} data-reveal style={delay(i * 70)} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="tabular text-3xl font-semibold tracking-[-0.02em] text-accent sm:text-4xl">{s.big}</p>
                <Info id={s.info} className="-mr-3 -mt-2" />
              </div>
              <p className="mt-1 font-medium">{s.label}</p>
              <p className="mt-1 text-sm text-muted">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. What, why, how on the left; the live thing on the right, so reading and doing sit together */}
      <section id="overview" aria-labelledby="overview-title" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 [&>*]:min-w-0">
          <div>
            <h2 id="overview-title" data-reveal className={h2}>
              Anchor in 30 seconds
            </h2>
            <dl className="mt-6 space-y-6">
              {[
                {
                  k: "What it is",
                  v: "A free tool that tells health workers where to hold free blood pressure checks: trusted local places, in the neighbourhoods that need them most. A plan names the places and adds a visit schedule, owner invitations and downloads.",
                  info: "overview-what" as InfoId,
                  href: "/app",
                  cta: "Open the full app",
                },
                {
                  k: "Why it matters",
                  v: "Half of US adults have high blood pressure, and only 1 in 4 of them has it under control. Checks in barbershops worked brilliantly in one study but never spread, because nobody knew which places each community trusts.",
                  info: "overview-why" as InfoId,
                  href: "#research",
                  cta: "See the research",
                },
                {
                  k: "How it works",
                  v: "CDC data shows where the need is. Qloo's taste data shows which places each age group loves there. Anchor checks every place, ranks them with a published formula, and shows each step as it runs.",
                  info: "overview-how" as InfoId,
                  href: "#how",
                  cta: "See the steps",
                },
              ].map((x, i) => (
                <div key={x.k} data-reveal style={delay(i * 80)}>
                  <dt className="flex items-center text-lg font-semibold text-accent">
                    {x.k}
                    <Info id={x.info} className="-my-2" />
                  </dt>
                  <dd className="mt-1">{x.v}</dd>
                  <dd>
                    <a href={x.href} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent underline underline-offset-4">
                      {x.cta} <ArrowRight aria-hidden="true" size={14} />
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-muted">
              New here? Each <span className="mx-1 font-semibold text-text">i</span> button explains one thing in plain words:
              hover it, tap it or press Enter. For the formulas and API calls, switch to
              <span className="mx-1 font-semibold text-text">Technical</span> at the top.
              <Info id="simple-technical" className="-my-3 align-middle" />
            </p>
          </div>
          <div id="try" className="scroll-mt-20">
            <h2 data-reveal className={h2}>
              Try it right here
            </h2>
            <p className="mt-3 max-w-[60ch] text-muted">
              Pick who and where. Anchor finds the neighbourhoods with the most untreated high blood pressure, then the places
              that group already goes to. No sign-up; about 8 seconds.
            </p>
            <div className="mt-5">
              <QuickTry
                placeholder={
                  <figure>
                    <Image
                      src={PHOTOS.cuff.src}
                      width={PHOTOS.cuff.width}
                      height={PHOTOS.cuff.height}
                      alt={PHOTOS.cuff.alt}
                      sizes="(min-width: 1024px) 640px, 100vw"
                      className="aspect-[2/1] w-full rounded-[12px] object-cover object-bottom"
                    />
                    <figcaption className="mt-2 text-sm text-muted">
                      What a plan leads to: a free check that takes about five minutes, with no appointment.
                    </figcaption>
                  </figure>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Everything else, one tab at a time */}
      <Section
        id="details"
        title="The research, the method and the proof"
        intro="Pick a tab. Each takes under a minute to read, and links to the full page if you want more."
      >
        <DeepDive panels={learn} />
      </Section>

      {/* 4. Who it is for, and every way to use it */}
      <Section
        id="ways"
        title="Use it your way"
        intro="Not a developer? You only need the web app. Building something? Get a free key and call Anchor from your own software."
      >
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 [&>*]:min-w-0">
          <div id="who" className="scroll-mt-20">
            <h3 className="text-xl font-semibold">Who it is for</h3>
            <ul className="mt-4 space-y-5">
              {AUDIENCES.map((a) => (
                <li key={a.title}>
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-1 text-muted">{a.body}</p>
                  <Link href={a.href} className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent">
                    {a.cta} <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div id="service" className="scroll-mt-20">
            <h3 className="flex items-center text-xl font-semibold">
              Use Anchor as a service <Info id="use-service" />
            </h3>
            <p className="mt-2">
              Get a free API key in one click. Send who and where; get back a ranked plan as data, ready for your dashboard,
              spreadsheet or app. No sign-up, and the key is never stored. No key at all? Use the demo key{" "}
              <code className="font-mono">anc_demo</code>.
            </p>
            <div className="mt-4">
              <CreateKey />
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {WAYS.filter((w) => w.info).map((w) => (
                <li key={w.title} className="rounded-[12px] bg-panel p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{w.title}</h4>
                    {w.info ? <Info id={w.info} className="-my-2 -mr-2" /> : null}
                  </div>
                  <p className="mt-1 text-muted">{w.simple}</p>
                  <p className="layer-technical mt-2 rounded-[8px] bg-bg p-2.5 text-sm">{w.technical}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              Full reference: the <Link href="/developers" className="text-accent underline underline-offset-4">developer docs</Link> and
              the <a href="/api/v1/openapi.json" className="text-accent underline underline-offset-4">OpenAPI spec</a>.
            </p>
          </div>
        </div>
      </Section>

      {/* 5. Questions, with every source one click away */}
      <Section id="faq" title="Questions">
        <div className="grid gap-10 pb-6 lg:grid-cols-[1.45fr_0.55fr] lg:gap-12 [&>*]:min-w-0">
          <Faq items={FAQ} />
          <div id="references" className="scroll-mt-20 space-y-4">
            <div className="rounded-[12px] bg-panel p-5">
              <h3 className="font-semibold">Still unsure?</h3>
              <ul className="mt-2 space-y-1">
                {[
                  ["/judges", "Judge mode: everything in 3 minutes"],
                  ["/glossary", "Glossary of every term"],
                  ["/how-it-works", "The full method"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex min-h-11 items-center gap-1 font-medium text-accent">
                      {label} <ArrowRight aria-hidden="true" size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <details className="group rounded-[12px] bg-panel">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold [&::-webkit-details-marker]:hidden">
                All {REFERENCES.length} sources
                <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-muted transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-90" />
              </summary>
              <ol className="space-y-2 px-5 pb-5">
                {REFERENCES.map((r) => (
                  <li key={r.id}>
                    <a href={r.href} className="text-accent underline underline-offset-4">
                      {r.text.split(". ").slice(0, 2).join(". ")}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
            <p className="text-muted">Every number on this page comes from a cited source.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
