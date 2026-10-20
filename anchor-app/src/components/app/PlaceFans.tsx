"use client";

import { useEffect, useState } from "react";
import { Info } from "@/components/Info";

type Area = { lat: number; lon: number; affinity: number; highNeed: boolean };
type Fans = { areas: Area[]; highNeedAreas: number; note: string };

/** "Where its fans are": a dot strip of the place's strongest fan areas, high-need ones filled, with a plain sentence and a table twin. */
export function PlaceFans({ qlooId, county }: { qlooId: string; county: string }) {
  const [data, setData] = useState<Fans | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The parent remounts this component per place (key), so state starts empty for each place.
    let live = true;
    fetch(`/api/v1/places/${encodeURIComponent(qlooId)}/fans?county=${county}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message ?? "No fan map.");
        return j as Fans;
      })
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [qlooId, county]);

  return (
    <section className="rounded-[10px] border border-border p-4" aria-labelledby={`fans-${qlooId}`}>
      <div className="flex items-center justify-between">
        <h3 id={`fans-${qlooId}`} className="text-sm font-semibold">Where its fans are</h3>
        <Info id="place-fans" className="-my-2 -mr-3" />
      </div>
      {error ? <p className="mt-2 text-sm text-muted">{error}</p> : null}
      {!data && !error ? <div className="mt-3 h-12 animate-pulse rounded-[8px] bg-surface-2" aria-hidden="true" /> : null}
      {data ? (
        <>
          <p className="mt-2">
            <span className="tabular text-lg font-semibold">{data.highNeedAreas} of {data.areas.length}</span> of its strongest fan areas are high-need neighbourhoods.
          </p>
          <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
            {data.areas.map((a, i) => (
              <span key={i} className={`h-3 w-3 rounded-full ${a.highNeed ? "bg-accent" : "border border-border bg-surface-2"}`} />
            ))}
          </div>
          <table className="sr-only">
            <caption>Strongest fan areas for this place</caption>
            <tbody>
              {data.areas.map((a, i) => (
                <tr key={i}>
                  <th scope="row">Area {i + 1}</th>
                  <td>{a.highNeed ? "High need" : "Not high need"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Filled dots are high need. {data.note}</p>
        </>
      ) : null}
    </section>
  );
}
