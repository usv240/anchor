import { metres } from "@/lib/domain/geo";
import type { Venue } from "@/lib/domain/venues";

/**
 * Deterministic ranking (anchor/TECHNICAL_DESIGN.md section 6). The language
 * model never decides the ranking; this formula does, and it is published.
 *
 *   trust    = 0.6 * affinity + 0.2 * popularity + 0.2 * community   (Qloo; null offline)
 *              community = share of Qloo's community-anchor tags present (Locals, Regulars, ...), capped at 1
 *   evidence = 1.0 trial-backed type, 0.8 everyday community place, 0.6 other
 *   feasible = 0.6 * established + 0.4 * on_preferred_days
 *   verified = 1.0 licensed, 0.95 listed by Qloo only
 *   anchor   = need * verified * (0.55 * trust + 0.30 * evidence + 0.15 * feasible)
 *
 * Offline (no Qloo key), trust is unknown, so its weight is shared out:
 *   anchor   = need * verified * (0.65 * evidence + 0.35 * feasible)
 */

export const WEIGHTS = {
  withTrust: { trust: 0.55, evidence: 0.3, feasible: 0.15 },
  offline: { evidence: 0.65, feasible: 0.35 },
  trustMix: { affinity: 0.6, popularity: 0.2, community: 0.2 },
  feasibleMix: { established: 0.6, days: 0.4 },
  // A Qloo listing has an address, a map point and a Google place id, so the penalty is small.
  // A partner the health team already works with certainly exists.
  verified: { licensed: 1, qloo_only: 0.95, partner: 1 },
  diversity: { perZone: 3, maxCategoryShare: 0.5, minMetres: 250 },
} as const;

export type TrustSignal = { affinity: number; popularity: number; community?: number; explanation?: string };

export type Group = "partner" | "trial" | "community";

export type Candidate = {
  venue: Venue;
  group: Group;
  zoneNeed: number;
  zoneRank: number;
  trust: TrustSignal | null;
  verification: "licensed" | "qloo_only" | "partner";
  openOnPreferredDays: boolean | null;
};

export type Scored = Candidate & {
  scores: { anchor: number; need: number; trust: number | null; evidence: number; feasible: number };
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Long-standing local businesses tend to be community anchors. 0 at under a year, 1 at 10 years or more. */
export function established(years: number | null): number {
  if (years === null) return 0.5;
  return Math.max(0, Math.min(1, years / 10));
}

export function scoreCandidate(c: Candidate): Scored {
  const trust = c.trust
    ? WEIGHTS.trustMix.affinity * c.trust.affinity + WEIGHTS.trustMix.popularity * c.trust.popularity + WEIGHTS.trustMix.community * (c.trust.community ?? 0)
    : null;
  // Opening days are unknown offline (licences have no hours): count as neutral 0.5.
  const days = c.openOnPreferredDays === null ? 0.5 : c.openOnPreferredDays ? 1 : 0;
  const feasible = WEIGHTS.feasibleMix.established * established(c.venue.yearsInBusiness) + WEIGHTS.feasibleMix.days * days;
  const verified = WEIGHTS.verified[c.verification];
  const evidence = c.venue.evidence;
  const blend =
    trust === null
      ? WEIGHTS.offline.evidence * evidence + WEIGHTS.offline.feasible * feasible
      : WEIGHTS.withTrust.trust * trust + WEIGHTS.withTrust.evidence * evidence + WEIGHTS.withTrust.feasible * feasible;
  return {
    ...c,
    scores: {
      anchor: round(c.zoneNeed * verified * blend),
      need: round(c.zoneNeed),
      trust: trust === null ? null : round(trust),
      evidence: round(evidence),
      feasible: round(feasible),
    },
  };
}

/**
 * Greedy selection by score with diversity rules, so a plan covers ground
 * instead of one block: at most 3 venues per zone, no category above half the
 * plan, and at least 250 m between chosen venues.
 */
export function selectDiverse(scored: Scored[], maxVenues: number, already: Scored[] = []): Scored[] {
  const sorted = [...scored].sort(
    (a, b) => b.scores.anchor - a.scores.anchor || a.venue.name.localeCompare(b.venue.name),
  );
  const chosen: Scored[] = [];
  const perZone = new Map<string, number>();
  const perCategory = new Map<string, number>();
  const taken = () => [...already, ...chosen];
  // The per-zone cap counts places already chosen for the other group, so a zone never gets more than 3 in total.
  for (const a of already) perZone.set(a.venue.zoneId, (perZone.get(a.venue.zoneId) ?? 0) + 1);
  const maxPerCategory = Math.max(1, Math.floor(maxVenues * WEIGHTS.diversity.maxCategoryShare));

  for (const s of sorted) {
    if (chosen.length >= maxVenues) break;
    if ((perZone.get(s.venue.zoneId) ?? 0) >= WEIGHTS.diversity.perZone) continue;
    if ((perCategory.get(s.venue.category) ?? 0) >= maxPerCategory) continue;
    if (taken().some((c) => metres(c.venue, s.venue) < WEIGHTS.diversity.minMetres)) continue;
    chosen.push(s);
    perZone.set(s.venue.zoneId, (perZone.get(s.venue.zoneId) ?? 0) + 1);
    perCategory.set(s.venue.category, (perCategory.get(s.venue.category) ?? 0) + 1);
  }
  return chosen;
}
