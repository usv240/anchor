"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Info } from "@/components/Info";
import type { Plan, PlanEvent } from "@/lib/domain/types";
import { shareUrl } from "@/lib/share";

const AUDIENCES = [
  { label: "Men 35 to 54", audience: { ageGroups: ["35_to_54"], gender: "male" } },
  { label: "Women 55 and older", audience: { ageGroups: ["55_plus"], gender: "female" } },
  { label: "Adults 18 to 34", audience: { ageGroups: ["18_to_34"], gender: "any" } },
] as const;
const PLACES = [
  { label: "Los Angeles", fips: "06037" },
  { label: "San Francisco", fips: "06075" },
] as const;

/**
 * The landing page's one live thing: pick who and where, and Anchor makes a
 * real plan right here, showing each step as it runs. Same API as the app
 * (POST /api/v1/plans, basic planner for speed); the full plan opens in the app.
 */
export function QuickTry({ placeholder }: { placeholder?: ReactNode }) {
  const [who, setWho] = useState(0);
  const [where, setWhere] = useState(0);
  const [step, setStep] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = step !== null;

  async function run() {
    setPlan(null);
    setError(null);
    setStep("Starting");
    try {
      const res = await fetch("/api/v1/plans?planner=basic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audience: AUDIENCES[who].audience, area: { countyFips: PLACES[where].fips }, options: { zones: 6, maxVenues: 8 } }),
      });
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? `The server answered ${res.status}.`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as PlanEvent;
          if (e.type === "step" && e.status === "running") setStep(e.label);
          else if (e.type === "plan") setPlan(e.plan);
          else if (e.type === "error") throw new Error(e.message);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStep(null);
    }
  }

  const chip = "press min-h-11 rounded-full px-4 text-sm font-medium aria-pressed:bg-accent aria-pressed:text-accent-contrast bg-bg hover:bg-surface-2";

  return (
    <div className="rounded-[16px] bg-panel p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-4">
          <div>
            <p className="flex items-center text-sm font-semibold">
              Who do you want to reach? <Info id="input-age" className="-my-2" />
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AUDIENCES.map((a, i) => (
                <button key={a.label} type="button" aria-pressed={who === i} onClick={() => setWho(i)} className={chip}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="flex items-center text-sm font-semibold">
              Where? <Info id="input-county" className="-my-2" />
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLACES.map((p, i) => (
                <button key={p.fips} type="button" aria-pressed={where === i} onClick={() => setWhere(i)} className={chip}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-70"
        >
          {busy ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : null}
          {busy ? "Planning" : "Find the places"}
        </button>
      </div>

      <div aria-live="polite" className="mt-6">
        {!busy && !plan && !error ? placeholder : null}
        {busy ? <p className="text-muted">{step}&hellip;</p> : null}
        {error ? <p role="alert" className="text-danger">{error}</p> : null}
        {plan ? (
          <div>
            <p className="text-lg">{plan.summary}</p>
            <ol className="mt-4 grid gap-3 md:grid-cols-2">
              {plan.venues.slice(0, 6).map((v) => (
                <li key={v.id} className="rounded-[12px] bg-bg p-4">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 font-semibold">
                      <span className="tabular mr-2 text-muted">{v.rank}</span>
                      {v.name}
                    </span>
                    <span className="tabular shrink-0 font-semibold text-accent">{v.scores.anchor.toFixed(2)}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {v.category} &middot; {v.group === "trial" ? "the venue type the study tested" : plan.mode.trust === "qloo" ? "a place this group loves (Qloo)" : "a local business"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm">{v.why}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Link href={shareUrl(plan, "")} className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent underline underline-offset-4">
                Open the full plan: map, schedule, invitations, downloads <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <span className="text-muted">{plan.mode.trust === "qloo" ? "Live Qloo taste data." : "Ranked by need, venue type and years in business."}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
