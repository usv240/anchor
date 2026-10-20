"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "@/components/Info";
import type { Plan } from "@/lib/domain/types";

/**
 * Map of one plan: its high-need zones and numbered venue pins. SVG, no map
 * library, no tile server, so it always works (including offline demos).
 * The results list next to it is the accessible equivalent of this map.
 */

type Ring = number[][];
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
type TractFeature = { properties: { zoneId: string; need_pct: number }; geometry: Geometry };

let tractsPromise: Promise<TractFeature[]> | null = null;
function loadTracts(): Promise<TractFeature[]> {
  tractsPromise ??= fetch("/data/need/06037/zone_tracts.geojson")
    .then((r) => r.json())
    .then((fc: { features: TractFeature[] }) => fc.features);
  return tractsPromise;
}

const outerRings = (g: Geometry): Ring[] => (g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]));

const W = 800;

export function PlanMap({
  plan,
  selectedId,
  onSelect,
}: {
  plan: Plan;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [tracts, setTracts] = useState<TractFeature[] | null>(null);
  const [showTaste, setShowTaste] = useState(false);
  const [cells, setCells] = useState<{ lat: number; lon: number; affinity: number }[] | null>(null);
  const [tasteError, setTasteError] = useState<string | null>(null);
  const tasteOn = plan.mode.trust === "qloo";
  const toggleTaste = async () => {
    const next = !showTaste;
    setShowTaste(next);
    if (next && !cells) {
      const ages = plan.request.audience.ageGroups.join(",");
      try {
        const r = await fetch(`/api/v1/heatmap?ages=${ages}&gender=${plan.request.audience.gender}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message ?? "The taste map could not load.");
        setCells(j.cells);
      } catch (e) {
        setTasteError((e as Error).message);
      }
    }
  };
  useEffect(() => {
    let live = true;
    loadTracts().then((t) => live && setTracts(t));
    return () => {
      live = false;
    };
  }, []);

  const view = useMemo(() => {
    if (!tracts) return null;
    const ids = new Set(plan.zones.map((z) => z.zoneId));
    const mine = tracts.filter((t) => ids.has(t.properties.zoneId));
    const pts: number[][] = [...mine.flatMap((t) => outerRings(t.geometry).flat()), ...plan.venues.map((v) => [v.lon, v.lat])];
    if (pts.length === 0) return null;
    let minX = Math.min(...pts.map((p) => p[0]));
    let maxX = Math.max(...pts.map((p) => p[0]));
    let minY = Math.min(...pts.map((p) => p[1]));
    let maxY = Math.max(...pts.map((p) => p[1]));
    const padX = (maxX - minX) * 0.08 + 0.004;
    const padY = (maxY - minY) * 0.08 + 0.004;
    minX -= padX;
    maxX += padX;
    minY -= padY;
    maxY += padY;
    const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
    const scale = W / ((maxX - minX) * k);
    const H = Math.max(260, Math.min(900, (maxY - minY) * scale));
    const xy = (p: number[]) => [(p[0] - minX) * k * scale, (maxY - p[1]) * scale] as const;
    const path = (ring: Ring) => "M" + ring.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join("L") + "Z";
    return {
      H,
      zones: mine.map((t, i) => ({ id: `${t.properties.zoneId}-${i}`, need: t.properties.need_pct, d: outerRings(t.geometry).map(path).join("") })),
      // Context: other high-need neighbourhoods in view, faint.
      others: tracts
        .filter((t) => !ids.has(t.properties.zoneId))
        .filter((t) => outerRings(t.geometry).some((r) => r.some((p) => p[0] > minX && p[0] < maxX && p[1] > minY && p[1] < maxY)))
        .map((t, i) => ({ id: `o-${i}`, d: outerRings(t.geometry).map(path).join("") })),
      pins: plan.venues.map((v) => ({ id: v.id, rank: v.rank, name: v.name, xy: xy([v.lon, v.lat]) })),
      xy,
      bounds: { minX, maxX, minY, maxY },
      cellR: Math.max(3, 0.004 * k * scale),
    };
  }, [tracts, plan]);

  if (!view) {
    return <div className="grid h-72 place-items-center rounded-[12px] bg-surface-2 text-sm text-muted">Loading map</div>;
  }

  const zoneRank = new Map(plan.zones.map((z) => [z.zoneId, z.rank]));
  return (
    <figure className="overflow-hidden rounded-[12px] border border-border bg-bg">
      <svg viewBox={`0 0 ${W} ${Math.ceil(view.H)}`} className="h-auto w-full" role="img" aria-label={`Map of ${plan.venues.length} places in ${plan.zones.length} high-need zones. The same places are listed in the results.`}>
        <rect width={W} height={Math.ceil(view.H)} fill="var(--surface-2)" />
        {view.others.map((z) => (
          <path key={z.id} d={z.d} fill="var(--accent)" fillOpacity={0.12} stroke="none" />
        ))}
        {view.zones.map((z) => (
          <g key={z.id}>
            <path d={z.d} fill="var(--accent)" fillOpacity={0.25 + 2.5 * Math.max(0, z.need - 0.8)} stroke="var(--surface-2)" strokeWidth={0.6} />
          </g>
        ))}
        {showTaste && cells
          ? cells
              .filter((c) => c.lon > view.bounds.minX && c.lon < view.bounds.maxX && c.lat > view.bounds.minY && c.lat < view.bounds.maxY)
              .map((c, i) => {
                const [x, y] = view.xy([c.lon, c.lat]);
                return <circle key={i} cx={x} cy={y} r={view.cellR} fill="var(--warning)" fillOpacity={0.15 + 0.6 * (c.affinity - 0.5) * 2} />;
              })
          : null}
        {view.pins.map((p) => {
          const sel = p.id === selectedId;
          return (
            <g
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="cursor-pointer"
              aria-hidden="true"
            >
              <circle cx={p.xy[0]} cy={p.xy[1]} r={sel ? 15 : 12} fill={sel ? "var(--accent)" : "var(--text)"} stroke="var(--bg)" strokeWidth={2.5} />
              <text x={p.xy[0]} y={p.xy[1] + 4.5} textAnchor="middle" fontSize={sel ? 14 : 12} fontWeight={700} fill={sel ? "var(--accent-contrast)" : "var(--bg)"}>
                {p.rank}
              </text>
              <title>{`${p.rank}. ${p.name}`}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm bg-accent opacity-60" /> Neighbourhoods in this plan (darker = higher need)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded-sm bg-accent opacity-15" /> Other high-need neighbourhoods
        </span>
        <span>Zones by rank: {[...zoneRank.values()].sort((a, b) => a - b).join(", ")}</span>
        {showTaste && cells ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-warning opacity-70" /> Where this group&apos;s tastes concentrate (Qloo)
          </span>
        ) : null}
        {tasteOn ? (
          <span className="ml-auto flex items-center">
            <button type="button" aria-pressed={showTaste} onClick={toggleTaste} className="min-h-11 rounded-[8px] border border-border px-3 font-medium text-text aria-pressed:border-warning aria-pressed:bg-surface-2">
              {showTaste ? "Hide taste map" : "Show taste map"}
            </button>
            <Info id="taste-map" className="-my-2" />
          </span>
        ) : null}
        {tasteError ? <span className="w-full text-danger">{tasteError}</span> : null}
      </figcaption>
    </figure>
  );
}
