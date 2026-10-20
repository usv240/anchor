import type { Metadata } from "next";
import Link from "next/link";
import { loadResults } from "@/lib/results";

export const metadata: Metadata = { title: "Safety and limits" };

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border-t border-border py-8">
      <h2 id={`${id}-t`} className="text-2xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-[1.0625rem]">{children}</div>
    </section>
  );
}

export default async function SafetyPage() {
  const r = await loadResults();
  return (
    <div className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Safety and limits</h1>
      <p className="mt-4 text-lg text-muted">What Anchor does, what it refuses to do, and what its data cannot tell you. Each promise below is tested, and the results are on the Proof page.</p>

      <Block id="targeting" title="No targeting by race, ethnicity, religion or origin">
        <p>
          Anchor plans by neighbourhood need, age and gender only. Guessing someone&apos;s race from what they like is unreliable and can harm communities, and the need data already shows where help is needed most.
        </p>
        <p>
          If someone asks to target a group by race, ethnicity, religion, national origin or immigration status, Anchor does not simply refuse. It makes a plan for the highest-need neighbourhoods instead and explains why in one sentence. Qloo audience types that could act as a stand-in for these groups are switched off in code.
        </p>
        <p className="rounded-[10px] bg-surface-2 p-4">
          <strong>Measured:</strong> {r.policy.targeting.passed} of {r.policy.targeting.total} targeting requests were reframed, and {r.policy.controls.passed} of {r.policy.controls.total} ordinary requests that only look similar (such as Koreatown or Blackwelder Street) were correctly left alone.{" "}
          <Link className="text-accent underline underline-offset-4" href="/proof">See every test</Link>
        </p>
        <p className="text-sm text-muted">Honesty note: the first run missed one request (&ldquo;people from Mexico&rdquo;). We fixed the rule, so the current score is on prompts we had already seen. A fresh, unseen test set is planned.</p>
      </Block>

      <Block id="venues" title="Only suitable, real shopfronts">
        <p>Every place in a plan has an active business licence and sits inside an actual high-need neighbourhood. Bars, liquor stores, smoke shops and similar are always removed, whatever anyone asks for.</p>
        <p>Anchor never lists private individuals. Businesses registered under a person&apos;s own name without a trading name, apartment addresses and mobile services such as freelance make-up artists are left out before planning starts.</p>
      </Block>

      <Block id="privacy" title="Privacy">
        <ul className="list-disc space-y-2 pl-6">
          <li>No accounts, no tracking cookies and no personal data. Plans are about neighbourhoods, age groups and businesses.</li>
          <li>Qloo&apos;s data describes what groups of people like. It contains no personal information.</li>
          <li>If you use your own Qloo key, it is used for that one request and is never stored or logged.</li>
          <li>Plans are stored for a limited time so share links work. They contain no personal data.</li>
        </ul>
      </Block>

      <Block id="medical" title="Not medical advice">
        <p>Anchor plans where to hold outreach. It does not diagnose, prescribe or give medical advice, and its AI agent is instructed never to. Health programmes, pharmacists and clinicians stay in charge of care.</p>
        {r.policy.medical.measured ? (
          <p>
            <strong>Measured:</strong> asked for pill choices, doses, whether to stop medicine, diagnoses or a flyer saying checks cure high blood pressure, the AI agent declined {r.policy.medical.passed} of {r.policy.medical.total} times and pointed people to a doctor or pharmacist. Each answer was checked by a word check and by a separate AI judge.
          </p>
        ) : null}
      </Block>

      <Block id="limits" title="What the data cannot tell you">
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>CDC figures are estimates.</strong> They come from a national survey and statistical models, not from counting patients. They are good for comparing neighbourhoods.</li>
          <li><strong>Business data has gaps.</strong> It comes from businesses registered with the City of Los Angeles, so most other cities in the county are missing, and some listed businesses may have closed.</li>
          <li><strong>Taste is not footfall.</strong> Qloo shows what a group of people likes, not how many people walk through a door.</li>
          <li><strong>Qloo does not know small barbershops and salons.</strong> In the top high-need zone it returned none, against 60 licensed ones. That is why barbershops and salons come from city licences.</li>
          <li><strong>Some Qloo signals did not help, so we do not use them.</strong> Interest audiences (for example health and beauty, or football fans) moved affinity by only 0.05 and barely changed the order. Explainability is not available for age and gender only queries.</li>
          <li><strong>Reading corner books are checked, not guaranteed.</strong> Qloo is limited to children&apos;s genres, then each book must be filed as a children&apos;s book by Open Library or come from a children&apos;s publisher. Please look through each book before shelving it.</li>
          <li><strong>The plan is a starting point.</strong> Always confirm opening hours and permission with each owner, and trust local knowledge where it disagrees.</li>
          <li><strong>The health effect comes from the programme.</strong> The barbershop study&apos;s results came from pharmacists working with barbers. Anchor helps you find the places; it cannot promise the same results.</li>
        </ul>
      </Block>
    </div>
  );
}
