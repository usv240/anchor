import { county } from "@/lib/domain/counties";
import type { Plan } from "@/lib/domain/types";

/**
 * Plan exports that land in tools people already use (winner pattern 5):
 * CSV for spreadsheets, GeoJSON for map tools, ICS for calendars.
 */

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  // Guard text against spreadsheet formula injection (numbers are never formulas), then quote.
  const safe = typeof v !== "number" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCsv(plan: Plan): string {
  const header = [
    "rank",
    "name",
    "category",
    "address",
    "city",
    "zip",
    "lat",
    "lon",
    "zone_id",
    "zone_rank",
    "anchor_score",
    "need",
    "trust",
    "evidence",
    "feasible",
    "verified",
    "years_in_business",
    "visit_date",
    "visit_time",
    "why",
  ];
  const visitOf = new Map(plan.visits.map((v) => [v.venueId, v]));
  const rows = plan.venues.map((v) => {
    const visit = visitOf.get(v.id);
    return [
      v.rank,
      v.name,
      v.category,
      v.address,
      v.city,
      v.zip,
      v.lat,
      v.lon,
      v.zoneId,
      v.zoneRank,
      v.scores.anchor,
      v.scores.need,
      v.scores.trust ?? "",
      v.scores.evidence,
      v.scores.feasible,
      v.verification.status,
      v.yearsInBusiness ?? "",
      visit?.date ?? "",
      visit ? `${visit.start}-${visit.end}` : "",
      v.why,
    ].map(csvCell);
  });
  return [header.map(csvCell), ...rows].map((r) => r.join(",")).join("\r\n") + "\r\n";
}

export function toGeoJson(plan: Plan): string {
  return JSON.stringify({
    type: "FeatureCollection",
    properties: {
      planId: plan.planId,
      createdAt: plan.createdAt,
      attribution: `Venues: ${county(plan.request.area.countyFips).licenceSource}. Need: CDC PLACES (public domain).`,
    },
    features: plan.venues.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.lon, v.lat] },
      properties: {
        rank: v.rank,
        name: v.name,
        category: v.category,
        address: v.address,
        zoneId: v.zoneId,
        anchorScore: v.scores.anchor,
        need: v.scores.need,
        trust: v.scores.trust,
        verified: v.verification.status,
        why: v.why,
      },
    })),
  });
}

/** RFC 5545 text escaping and 75-octet line folding. */
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function toIcs(plan: Plan, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const byId = new Map(plan.venues.map((v) => [v.id, v]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anchor//Outreach plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText("Anchor outreach plan")}`,
  ];
  for (const visit of plan.visits) {
    const v = byId.get(visit.venueId);
    if (!v) continue;
    const day = visit.date.replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${plan.planId}-${v.id}@anchor`,
      `DTSTAMP:${stamp}`,
      // Floating local time: the event shows at this clock time wherever the calendar is.
      `DTSTART:${day}T${visit.start.replace(":", "")}00`,
      `DTEND:${day}T${visit.end.replace(":", "")}00`,
      `SUMMARY:${icsText(`Blood pressure outreach: ${v.name}`)}`,
      `LOCATION:${icsText([v.address, v.city, `CA ${v.zip}`].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${icsText(`${v.why}\n\nRank ${v.rank} of ${plan.venues.length}. Plan ${plan.planId}. Confirm with the owner before visiting.`)}`,
      `GEO:${v.lat};${v.lon}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
