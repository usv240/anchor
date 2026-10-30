"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Info } from "@/components/Info";
import type { Plan } from "@/lib/domain/types";
import { shareUrl } from "@/lib/share";

const SIDES = [
  { label: "Men aged 35 to 54", audience: { ageGroups: ["35_to_54"], gender: "male" } },
  { label: "Women aged 55 and older", audience: { ageGroups: ["55_plus"], gender: "female" } },
] as const;

/**
 * Qloo's part made visible: two real plans for the same neighbourhoods and two
 * audiences, side by side. Both are made live on click (same API as the app,
 * basic planner for speed); nothing here is stored or precomputed.
 */
export function AudienceCompare() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const out = await Promise.all(
        SIDES.map(async (s) => {
          const r = await fetch("/api/v1/plans?planner=basic&stream=false", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ audience: s.audience, area: { countyFips: "06037" }, options: { zones: 8, maxVenues: 12 } }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error?.message ?? `The server answered ${r.status}.`);
          return j as Plan;
        }),
      );
      setPlans(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const loved = (p: Plan) => p.venues.filter((v) => v.group === "community");
  const shared = plans ? loved(plans[0]).filter((a) => loved(plans[1]).some((b) => b.name === a.name)).length : 0;
  const qloo = plans?.every((p) => p.mode.trust === "qloo");

  return (
    <div className="rounded-[16px] bg-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[60ch]">
          Same county, same high-need neighbourhoods. Only the audience changes.
          <Info id="compare-audiences" className="-my-3 align-middle" />
        </p>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="press inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-accent px-6 font-semibold text-accent-contrast hover:opacity-90 disabled:opacity-70"
        >
          {busy ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : null}
          {busy ? "Asking Qloo" : plans ? "Run both again" : "Compare two audiences"}
        </button>
      </div>

      <div aria-live="polite">
        {error ? <p role="alert" className="mt-4 text-danger">{error}</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {SIDES.map((s, i) => {
            const p = plans?.[i];
            const list = p ? loved(p).slice(0, 5) : [];
            return (
              <div key={s.label} className="rounded-[12px] bg-bg p-4">
                <p className="font-semibold">{s.label}</p>
                <p className="text-sm text-muted">Places this group loves, from Qloo</p>
                {p ? (
                  <>
                    <ol className="mt-3 space-y-2">
                      {list.map((v, n) => (
                        <li key={v.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0">
                            <span className="tabular mr-2 text-muted">{n + 1}</span>
                            <span className="font-medium">{v.name}</span>
                            <span className="text-sm text-muted"> &middot; {v.category}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    <Link href={shareUrl(p, "")} className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent underline underline-offset-4">
                      Open this plan <ArrowRight aria-hidden="true" size={14} />
                    </Link>
                  </>
                ) : (
                  <ol className="mt-3 space-y-2" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <li key={n} className={`h-6 rounded-[6px] bg-panel ${busy ? "animate-pulse" : ""}`} style={{ width: `${88 - n * 9}%` }} />
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
        {plans ? (
          <p className="mt-4 text-lg font-semibold">
            {qloo
              ? `${shared} of ${loved(plans[0]).length} Qloo places shared. CDC data says where; Qloo says which places each group calls its own.`
              : "Qloo is off on this server, so both lists come from business licences only."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
