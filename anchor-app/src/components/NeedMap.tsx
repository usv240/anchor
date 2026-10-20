import type { Focus } from "@/lib/need";

/**
 * Server-rendered SVG map of the densest high-need area. No map library and
 * no client JavaScript, so it paints instantly. It shows real neighbourhood
 * shapes (CDC PLACES + Census tracts): darker blue means higher need. Numbered
 * pins mark the zones with the most untreated adults. The caller renders an
 * accessible list twin with the same data. The interactive map lives in /app.
 */

type Position = number[];
type Geometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

const WIDTH = 800;

function makeProjector(bbox: Focus["bbox"]) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = WIDTH / ((maxLon - minLon) * k);
  const height = (maxLat - minLat) * scale;
  const xy = (p: Position): [number, number] => [(p[0] - minLon) * k * scale, (maxLat - p[1]) * scale];
  return { xy, height };
}

function toPath(geom: Geometry, xy: (p: Position) => [number, number]): string {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  return polys
    .flatMap((rings) =>
      rings.map((ring) => "M" + ring.map((p) => xy(p).map((v) => v.toFixed(1)).join(",")).join("L") + "Z"),
    )
    .join("");
}

// Need percentile within the county's top fifth: 0.80 to 1.00, in 4 steps.
function opacityFor(needPct: number): number {
  if (needPct > 0.95) return 1;
  if (needPct > 0.9) return 0.78;
  if (needPct > 0.85) return 0.58;
  return 0.4;
}

export function NeedMap({
  focus,
  pins = 10,
  titleId,
  descId,
}: {
  focus: Focus;
  pins?: number;
  titleId: string;
  descId: string;
}) {
  const { xy, height } = makeProjector(focus.bbox);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${Math.ceil(height)}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className="h-auto w-full"
    >
      <rect width={WIDTH} height={Math.ceil(height)} fill="var(--bg)" />
      <path d={toPath(focus.land as Geometry, xy)} fill="var(--surface-2)" stroke="var(--border)" strokeWidth={1} />
      {focus.tracts.features.map((f, i) => (
        <path
          key={i}
          d={toPath(f.geometry as Geometry, xy)}
          fill="var(--accent)"
          fillOpacity={opacityFor(f.properties.needPct)}
          stroke="var(--surface-2)"
          strokeWidth={0.5}
        />
      ))}
      {focus.pins.slice(0, pins).map((p) => {
        const [x, y] = xy(p.centroid);
        return (
          <g key={p.zoneId}>
            <circle cx={x} cy={y} r={10} fill="var(--text)" stroke="var(--bg)" strokeWidth={2} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--bg)">
              {p.rank}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function NeedLegend() {
  const steps = [
    { o: 0.4, label: "High" },
    { o: 0.58, label: "" },
    { o: 0.78, label: "" },
    { o: 1, label: "Highest" },
  ];
  return (
    <div className="flex items-center gap-2 text-xs text-muted" aria-hidden="true">
      <span>Need:</span>
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="inline-block h-3 w-6 rounded-sm bg-accent" style={{ opacity: s.o }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
