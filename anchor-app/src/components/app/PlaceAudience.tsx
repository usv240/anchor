"use client";

import { useEffect, useState } from "react";
import { Info } from "@/components/Info";

type Row = { group: string; label: string; affinity: number };
type Audience = { age: Row[]; gender: Row[]; note: string };

/** "Who loves this place": Qloo demographic affinity as a diverging bar chart, with a table twin for screen readers. */
export function PlaceAudience({ qlooId, highlight }: { qlooId: string; highlight: { ages: string[]; gender: "male" | "female" | "any" } }) {
  const [data, setData] = useState<Audience | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The parent remounts this component per place (key), so state starts empty for each place.
    let live = true;
    fetch(`/api/v1/places/${encodeURIComponent(qlooId)}/audience`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message ?? "No audience profile.");
        return j as Audience;
      })
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [qlooId]);

  const max = data ? Math.max(0.2, ...[...data.age, ...data.gender].map((r) => Math.abs(r.affinity))) : 1;
  const isMine = (r: Row) => highlight.ages.includes(r.group) || r.group === highlight.gender;

  return (
    <section className="rounded-[10px] border border-border p-4" aria-labelledby={`aud-${qlooId}`}>
      <div className="flex items-center justify-between">
        <h3 id={`aud-${qlooId}`} className="text-sm font-semibold">Who loves this place</h3>
        <Info id="place-audience" className="-my-2 -mr-3" />
      </div>
      {error ? <p className="mt-2 text-sm text-muted">{error}</p> : null}
      {!data && !error ? <div className="mt-3 h-40 animate-pulse rounded-[8px] bg-surface-2" aria-hidden="true" /> : null}
      {data ? (
        <>
          <div className="mt-3 space-y-1.5" aria-hidden="true">
            {[...data.age, ...data.gender].map((r) => {
              const w = (Math.abs(r.affinity) / max) * 50;
              return (
                <div key={r.group} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-xs">
                  <span className={isMine(r) ? "font-semibold" : "text-muted"}>{r.label}</span>
                  <span className="relative h-3 rounded-sm bg-surface-2">
                    <span className="absolute left-1/2 top-0 h-3 w-px bg-border" />
                    <span
                      className={`absolute top-0 h-3 rounded-sm ${r.affinity >= 0 ? "bg-accent" : "bg-muted"}`}
                      style={r.affinity >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                    />
                  </span>
                  <span className="tabular text-right">{r.affinity > 0 ? "+" : ""}{r.affinity.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <table className="sr-only">
            <caption>Qloo audience affinity for this place</caption>
            <tbody>
              {[...data.age, ...data.gender].map((r) => (
                <tr key={r.group}>
                  <th scope="row">{r.label}</th>
                  <td>{r.affinity.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">{data.note} Bold rows are the group you chose.</p>
        </>
      ) : null}
    </section>
  );
}
