import type { Metadata } from "next";
import Image from "next/image";
import { PHOTOS } from "@/content/photos";
import { REFERENCES, VOICES } from "@/content/landing";

export const metadata: Metadata = { title: "Research" };

const PROBLEM = [
  { n: "119.9 million", m: "US adults with high blood pressure (48.1% of adults)." },
  { n: "22.5%", m: "Of them have it under control, about 1 in 4." },
  { n: "680,179", m: "Deaths in 2024 where high blood pressure was a main or contributing cause." },
  { n: "About 1 in 6", m: "People with high blood pressure who do not know they have it." },
];

const LIMITS = [
  "The barbershop result came from pharmacists working with barbers, not from the venue alone. Anchor finds venues; the outcome still depends on the health programme that shows up there.",
  "The trial studied one group (Black men) in one city (Los Angeles). Other venue types and groups have not yet been tested in a randomised trial. Anchor makes those venues findable so programmes can try them and measure the results.",
  "No study has tested whether data-driven venue selection beats local knowledge. Our evaluation compares Anchor with simpler alternatives, but only a field trial could prove the health effect.",
  "CDC PLACES values are model-based estimates, not clinical counts. They are good for ranking neighbourhoods, not for counting patients.",
  "Qloo affinity measures what a group likes, not foot traffic.",
];

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-[860px] px-4 py-16 sm:px-6">
      <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">The research behind Anchor</h1>
      <p className="mt-4 text-lg text-muted">
        Every number on this site comes from a cited source. This page explains the evidence in plain words, and is
        just as clear about what the evidence does not show.
      </p>

      <h2 id="problem" className="mt-12 scroll-mt-24 text-2xl font-semibold">The problem in numbers</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {PROBLEM.map((p) => (
          <div key={p.n} className="rounded-[12px] bg-panel p-5">
            <dt className="tabular text-2xl font-semibold">{p.n}</dt>
            <dd className="mt-1 text-muted">{p.m}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted">Source: CDC, High Blood Pressure Facts.</p>
      <figure className="mt-6">
        <Image
          src={PHOTOS.cuff.src}
          width={PHOTOS.cuff.width}
          height={PHOTOS.cuff.height}
          alt={PHOTOS.cuff.alt}
          sizes="(min-width: 860px) 812px, 100vw"
          className="aspect-[21/9] w-full rounded-[16px] object-cover object-bottom"
        />
        <figcaption className="mt-2 text-sm text-muted">A check takes about five minutes and needs no appointment.</figcaption>
      </figure>

      <h2 id="study" className="mt-12 scroll-mt-24 text-2xl font-semibold">The key study: health care in barbershops</h2>
      <div className="mt-4 space-y-3 text-[1.0625rem]">
        <p>
          In 2018, researchers in Los Angeles split 52 Black-owned barbershops into two groups by chance. 319 men with
          high blood pressure took part. In one group, barbers encouraged customers to meet specially trained
          pharmacists inside the shop. The pharmacists could prescribe medicine, working with each man&apos;s doctor. In
          the other group, barbers encouraged healthy habits and doctor visits.
        </p>
        <p>
          After 6 months, <strong>63.6%</strong> of men in the pharmacist group had reached a healthy blood pressure
          (below 130/80), against <strong>11.7%</strong> in the other group. Their top blood pressure number fell by 27
          points on average, against 9 points. 95% of men stayed in the study.
        </p>
        <p className="text-muted">
          Victor RG et al. A cluster-randomized trial of blood-pressure reduction in Black barbershops. N Engl J Med.
          2018;378(14):1291-1301.
        </p>
      </div>

      <h2 id="impact" className="mt-12 scroll-mt-24 text-2xl font-semibold">What this could prevent</h2>
      <div className="mt-4 space-y-3 text-[1.0625rem]">
        <p>
          A review of 123 trials and 613,815 people found that every 10-point drop in the top blood pressure number
          means about 27% fewer strokes, 28% fewer cases of heart failure, 20% fewer major heart and blood vessel events,
          and 13% fewer deaths from any cause (Ettehad et al., The Lancet, 2016).
        </p>
        <p>
          The barbershop study lowered that number by 21.6 points more than usual care. If a drop that size lasts, the
          same review suggests about <strong>49% fewer strokes</strong>, <strong>51% less heart failure</strong>,{" "}
          <strong>38% fewer major events</strong> and <strong>26% fewer deaths</strong>.
        </p>
        <p className="text-muted">
          These are our estimates, made by scaling the review&apos;s figures to a 21.6-point drop. They assume the drop
          lasts and that the effect grows in proportion. They are not results from Anchor or from the barbershop study.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Why it has not spread</h2>
      <div className="mt-4 space-y-3 text-[1.0625rem]">
        <p>
          A 2024 follow-up study reports that the barbershop programme &ldquo;has not expanded beyond the original
          clinical trial setting&rdquo; (Kohrman et al., PLoS One, 2024).
        </p>
        <p>
          The right place also differs between people. In a small 2023 survey of Black barbershop customers, 47% said
          they would like health care in a barbershop; others preferred pharmacies or home (Chong et al., Health Equity,
          2023). One kind of venue will not suit every community.
        </p>
        <p>
          The places exist. In the 20 highest-need zones of Los Angeles County, City of Los Angeles business records
          list 894 licensed barbershops and beauty salons, and that counts only the City of Los Angeles. What is missing
          is knowing which ones a given community trusts. That is the step Anchor does.
        </p>
      </div>

      <h2 id="reading" className="mt-12 scroll-mt-24 text-2xl font-semibold">The reading corner</h2>
      <div className="mt-4 space-y-3 text-[1.0625rem]">
        <p>
          Barbershops can reach children too. Barbershop Books, a nonprofit, puts children&apos;s books in barbershops: it reports over 200 barbershop partners and more than 23,000 boys served each month, and an
          independent evaluation found boys were more likely to be seen reading and to call themselves readers.
        </p>
        <p>
          Choice matters. In a randomised study across 17 high-poverty schools, children who were given books they chose themselves each summer did better on state reading tests than children who were not (effect
          size 0.14, and 0.21 for the poorest children). The effect is modest per child, and the approach is cheap.
        </p>
        <p className="text-muted">
          Sources: Barbershop Books (barbershopbooks.org); Allington RL et al., Addressing summer reading setback among economically disadvantaged elementary students, Reading Psychology, 2010, reviewed by the What
          Works Clearinghouse. Anchor&apos;s reading corner is a small add-on; blood pressure stays the main goal.
        </p>
      </div>

      <figure className="mt-12">
        <Image
          src={PHOTOS.interior.src}
          width={PHOTOS.interior.width}
          height={PHOTOS.interior.height}
          alt={PHOTOS.interior.alt}
          sizes="(min-width: 860px) 812px, 100vw"
          className="aspect-[21/9] w-full rounded-[16px] object-cover"
        />
        <figcaption className="mt-2 text-sm text-muted">
          Barbershops have long been places where neighbours wait, talk and trust each other. That waiting time is when a check fits in.
        </figcaption>
      </figure>

      <h2 id="voices" className="mt-12 scroll-mt-24 text-2xl font-semibold">Voices from the field</h2>
      <p className="mt-4 text-[1.0625rem]">
        What barbers, customers, pharmacists and health workers have told researchers, from published studies. Quotes are exact.
      </p>
      <ul className="mt-4 space-y-4">
        {VOICES.map((v) => (
          <li key={v.source} className="rounded-[12px] bg-panel p-5">
            <p className="text-sm font-semibold text-muted">{v.who}</p>
            {v.quote ? <blockquote className="mt-2 border-l-4 border-accent pl-3">&ldquo;{v.quote}&rdquo;</blockquote> : null}
            <p className="mt-2">{v.finding}</p>
            <a href={v.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4">
              {v.source}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">The gap Anchor fills</h2>
      <p className="mt-4 text-[1.0625rem]">
        A 2025 review of 42 US health programmes run in businesses found that most used barbershops and salons, and
        called for trying a wider variety of settings. Health departments know where the need is, from data like CDC
        PLACES. They rarely know which specific local places each group of residents loves. Anchor joins the two.
      </p>

      <h2 className="mt-12 text-2xl font-semibold">What the evidence does not show</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-[1.0625rem]">
        {LIMITS.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">References</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-6 text-muted">
        {REFERENCES.map((r) => (
          <li key={r.id}>
            {r.text}{" "}
            <a className="break-all text-accent underline underline-offset-4" href={r.href}>
              {r.href.replace("https://", "")}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
