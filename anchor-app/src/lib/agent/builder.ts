import { randomUUID } from "node:crypto";
import { inHighNeedTract, loadNeed, type Zone } from "@/lib/need";
import { venuesByZone, type Venue } from "@/lib/domain/venues";
import { checkTargeting, REFRAME_MESSAGE } from "@/lib/domain/policy";
import { scoreCandidate, selectDiverse, type Candidate, type Scored } from "@/lib/domain/scoring";
import { buildSchedule } from "@/lib/domain/schedule";
import type { TrustProvider } from "@/lib/domain/trust";
import { AGE_GROUPS, Plan, type Day, type PlanEvent, type PlanRequest, type PlanVenue, type PlanZone, type StepStatus } from "@/lib/domain/types";
import { TraceLedger } from "@/lib/trace/ledger";

/**
 * PlanBuilder holds the steps of a plan. The basic planner calls them in a
 * fixed order; the Claude agent calls the same steps as tools. Either way the
 * output is the same validated Plan, and every venue cites real trace records.
 */

const fmt = new Intl.NumberFormat("en-US");
/** At least this many places per zone count as loved, even in a small zone. */
const LOVED_MIN = 5;

export type BuilderDeps = {
  trust: TrustProvider;
  ledger?: TraceLedger;
  emit?: (e: PlanEvent) => void;
  now?: () => Date;
  planner: "claude" | "basic";
};

type ZoneState = { zone: Zone; rank: number; licensed: Venue[]; traceIds: string[] };

export class PlanBuilder {
  readonly ledger: TraceLedger;
  private readonly emit: (e: PlanEvent) => void;
  private readonly now: () => Date;
  private zones: ZoneState[] = [];
  private skippedZones = 0;
  private candidates: Candidate[] = [];
  private candidateTrace = new Map<string, string[]>();
  private removed: { name: string; category: string; reason: string }[] = [];
  private ranked: Scored[] = [];
  private reframed = false;
  private trustReturned = 0;
  private qlooRemoved: { name: string; category: string; reason: string }[] = [];
  private zoneAffinities = new Map<string, number[]>();
  private localFlavour: { zoneId: string; tags: { name: string; kind: string }[]; citations: string[] } | undefined;
  private lovedInfo = new Map<string, { categories: string[]; tags: string[]; servesAlcohol: boolean; openDays: Day[] | null; licensedMatch: boolean }>();
  private zonesAsked = 0;

  constructor(
    readonly request: PlanRequest,
    private readonly deps: BuilderDeps,
  ) {
    this.ledger = deps.ledger ?? new TraceLedger();
    this.emit = deps.emit ?? (() => {});
    this.now = deps.now ?? (() => new Date());
  }

  step(id: string, label: string, status: StepStatus, detail?: string) {
    this.emit({ type: "step", id, label, status, detail });
  }

  /** 1. Policy: reframe protected-group targeting to need-based planning. */
  checkPolicy(): { reframed: boolean } {
    const check = checkTargeting(this.request.prompt);
    this.reframed = check.reframed;
    this.ledger.append({
      tool: "policy.check",
      request: { prompt: this.request.prompt ?? "" },
      responseBody: JSON.stringify(check),
      summary: check.reframed ? "reframed to need-based geography" : "no protected-group targeting",
    });
    return { reframed: check.reframed };
  }

  /** 2. Need: the highest-need zones that have local business data. */
  async selectZones(count: number): Promise<PlanZone[]> {
    const label = "Finding the neighbourhoods with the most untreated high blood pressure";
    this.step("need", label, "running");
    const [{ zones }, byZone] = await Promise.all([loadNeed(this.request.area.countyFips), venuesByZone(this.request.area.countyFips)]);

    const picked: ZoneState[] = [];
    let skipped = 0;
    for (const [i, zone] of zones.entries()) {
      if (picked.length >= count) break;
      const licensed = (byZone.get(zone.zoneId) ?? []).filter((v) => v.zoneId === zone.zoneId);
      if (!licensed.some((v) => v.suitable)) {
        skipped += 1; // outside City of LA licence coverage
        continue;
      }
      picked.push({ zone, rank: i + 1, licensed, traceIds: [] });
    }
    this.skippedZones = skipped;

    const rec = this.ledger.append({
      tool: "need.zones",
      request: { county: this.request.area.countyFips, count },
      responseBody: JSON.stringify(picked.map((p) => [p.zone.zoneId, p.zone.estUntreatedAdults])),
      summary: `${picked.length} zones picked; ${skipped} higher-need zones skipped (no business data)`,
    });
    for (const p of picked) p.traceIds.push(rec.id);
    this.zones = picked;

    const total = picked.reduce((s, p) => s + p.zone.estUntreatedAdults, 0);
    this.step(
      "need",
      label,
      "done",
      `${picked.length} zones, home to about ${fmt.format(total)} adults with untreated high blood pressure (CDC estimates)`,
    );
    return this.zoneSummaries();
  }

  zoneSummaries(): PlanZone[] {
    return this.zones.map((z) => ({
      zoneId: z.zone.zoneId,
      rank: z.rank,
      need: z.zone.need,
      estUntreatedAdults: z.zone.estUntreatedAdults,
      adults: z.zone.adults,
      areaKm2: z.zone.areaKm2,
      centroid: z.zone.centroid,
      candidateVenues: z.licensed.filter((v) => v.suitable).length,
    }));
  }

  /**
   * 3. Find places, in two groups:
   *    trial      barbershops and salons from city licences (the venue type the NEJM trial tested)
   *    community  with Qloo: places this audience loves, re-ranked by their affinity;
   *               offline: other licensed everyday businesses (restaurants, laundromats and more)
   */
  async findPlaces(): Promise<{ zones: number; candidates: number; trial: number; community: number; trustMode: "qloo" | "offline"; placesFromQloo: number }> {
    const audienceLabel = this.audienceLabel();
    const label =
      this.deps.trust.mode === "qloo"
        ? `Asking Qloo which places ${audienceLabel} love in each zone`
        : "Collecting licensed local businesses in each zone";
    this.step("trust", label, "running");

    this.candidates = [];
    this.candidateTrace = new Map();
    this.qlooRemoved = [];
    this.lovedInfo = new Map();
    this.trustReturned = 0;
    this.zonesAsked = 0;
    const days = new Set(this.request.options.preferredDays);

    for (const z of this.zones) {
      const licRec = this.ledger.append({
        tool: "licences.zone",
        request: { zoneId: z.zone.zoneId, source: "data.lacity.org 6rrh-rzua" },
        responseBody: JSON.stringify(z.licensed.map((v) => v.id)),
        summary: `${z.licensed.length} licensed businesses in ${z.zone.zoneId}`,
      });
      const base = { zoneNeed: z.zone.need, zoneRank: z.rank, openOnPreferredDays: null };

      for (const v of z.licensed) {
        const trialType = v.category === "Barbershop" || v.category === "Beauty salon";
        if (!trialType && this.deps.trust.mode === "qloo") continue; // Qloo supplies the community group
        this.candidates.push({ ...base, venue: v, group: trialType ? "trial" : "community", trust: null, verification: "licensed" });
        this.candidateTrace.set(v.id, [...z.traceIds, licRec.id]);
      }

      if (this.deps.trust.mode === "qloo") {
        const t = await this.deps.trust.forZone({ zoneId: z.zone.zoneId, wkt: z.zone.wkt }, z.licensed, this.request.audience);
        this.trustReturned += t.returned;
        this.zonesAsked += 1;
        this.qlooRemoved.push(...t.removed);
        // Same rule as licensed places: inside an actual high-need neighbourhood, not just the zone outline.
        const inside = await Promise.all(t.loved.map((v) => inHighNeedTract(this.request.area.countyFips, z.zone.zoneId, v)));
        // "Loved" must be true: only this audience's top third by affinity in the zone qualifies.
        // (Qloo returns places by popularity; the audience changes the affinity, not the order.)
        const byAffinity = [...t.loved].sort((a, b) => b.trust.affinity - a.trust.affinity);
        const lovedCut = byAffinity[Math.max(0, Math.min(byAffinity.length, Math.max(LOVED_MIN, Math.ceil(byAffinity.length / 3))) - 1)]?.trust.affinity ?? 0;
        this.zoneAffinities.set(z.zone.zoneId, byAffinity.map((v) => v.trust.affinity));
        t.loved.forEach((v, i) => {
          if (!inside[i] || v.trust.affinity < lovedCut) return;
          this.candidates.push({
            ...base,
            venue: v,
            group: "community",
            trust: v.trust,
            verification: v.licensedMatch ? "licensed" : "qloo_only",
            openOnPreferredDays: v.openDays ? v.openDays.some((d) => days.has(d)) : null,
          });
          this.lovedInfo.set(v.id, { categories: v.qlooCategories, tags: v.qlooTags, servesAlcohol: v.servesAlcohol, openDays: v.openDays, licensedMatch: v.licensedMatch });
          this.candidateTrace.set(v.id, [...z.traceIds, licRec.id, ...t.traceIds]);
        });
        this.step("trust", label, "running", `${this.zonesAsked} of ${this.zones.length} zones done`);
      }
    }

    const trial = this.candidates.filter((c) => c.group === "trial").length;
    const community = this.candidates.length - trial;
    const detail =
      this.deps.trust.mode === "qloo"
        ? `${community} places ${audienceLabel} love (from ${this.trustReturned} Qloo places), plus ${trial} licensed barbershops and salons`
        : `${this.candidates.length} licensed businesses. Qloo taste ranking is off until a Qloo key is added.`;
    this.step("trust", label, this.deps.trust.mode === "qloo" ? "done" : "skipped", detail);
    return { zones: this.zones.length, candidates: this.candidates.length, trial, community, trustMode: this.deps.trust.mode, placesFromQloo: this.trustReturned };
  }

  /** 4. Check: remove unsuitable venues and excluded categories. */
  checkSuitability(excludeCategories: string[] = this.request.options.excludeCategories): { kept: number; removed: number } {
    const label = "Removing places that are not right for health outreach";
    this.step("check", label, "running");
    const excluded = new Set(excludeCategories.map((c) => c.toLowerCase()));
    const kept: Candidate[] = [];
    this.removed = [...this.qlooRemoved];
    for (const c of this.candidates) {
      if (!c.venue.suitable) {
        this.removed.push({ name: c.venue.name, category: c.venue.category, reason: c.venue.unsuitableReason ?? "Not suitable" });
      } else if (excluded.has(c.venue.category.toLowerCase())) {
        continue;
      } else {
        kept.push(c);
      }
    }
    this.candidates = kept;
    this.ledger.append({
      tool: "check.suitability",
      request: { excludeCategories },
      responseBody: JSON.stringify(this.removed),
      summary: `${this.removed.length} unsuitable places removed`,
    });
    this.step("check", label, "done", `${this.removed.length} bars, liquor stores and similar removed`);
    return { kept: kept.length, removed: this.removed.length };
  }

  /**
   * 5. Rank with the published formula and diversity rules, half the plan from
   *    each group. If one group runs short, the other fills the gap.
   */
  rank(maxVenues: number = this.request.options.maxVenues): { chosen: number; byCategory: Record<string, number>; trial: number; community: number } {
    const label = "Ranking places with Anchor's published formula";
    this.step("rank", label, "running");
    const scored = this.candidates.map(scoreCandidate);
    const trialPool = scored.filter((s) => s.group === "trial");
    const communityPool = scored.filter((s) => s.group === "community");
    const trialTarget = Math.ceil(maxVenues / 2);
    let trial = selectDiverse(trialPool, trialTarget);
    const community = selectDiverse(communityPool, maxVenues - trial.length, trial);
    if (trial.length + community.length < maxVenues) {
      trial = [...trial, ...selectDiverse(trialPool.filter((s) => !trial.includes(s)), maxVenues - trial.length - community.length, [...trial, ...community])];
    }
    const byScore = (a: Scored, b: Scored) => b.scores.anchor - a.scores.anchor;
    this.ranked = [...trial.sort(byScore), ...community.sort(byScore)];
    const byCategory = countBy(this.ranked.map((r) => r.venue.category));
    this.ledger.append({
      tool: "rank.formula",
      request: { maxVenues, candidates: scored.length, split: "half trial-tested venues, half community places" },
      responseBody: JSON.stringify(this.ranked.map((r) => [r.venue.id, r.group, r.scores.anchor])),
      summary: `${this.ranked.length} venues chosen (${trial.length} barbershops and salons, ${community.length} community places)`,
    });
    this.step("rank", label, "done", `${trial.length} barbershops and salons, ${community.length} ${this.deps.trust.mode === "qloo" ? "loved local places" : "other local places"}, from ${scored.length} candidates`);
    return { chosen: this.ranked.length, byCategory, trial: trial.length, community: community.length };
  }

  /** 5b. Taste analysis for talking points (Qloo only). Never fails the plan. */
  async flavour(): Promise<void> {
    if (!this.deps.trust.localFlavour || this.zones.length === 0) return;
    const top = this.zones[0].zone;
    this.step("flavour", "Asking Qloo what this group is into around the top zone", "running");
    try {
      const f = await this.deps.trust.localFlavour({ zoneId: top.zoneId, wkt: top.wkt }, this.request.audience);
      this.localFlavour = { zoneId: top.zoneId, tags: f.tags, citations: f.traceIds };
      this.step("flavour", "Asking Qloo what this group is into around the top zone", "done", f.tags.slice(0, 5).map((t) => t.name).join(", "));
    } catch (err) {
      this.step("flavour", "Asking Qloo what this group is into around the top zone", "skipped", (err as Error).message);
    }
  }

  rankedPreview() {
    return this.ranked.map((r, i) => ({
      rank: i + 1,
      name: r.venue.name,
      category: r.venue.category,
      zoneRank: r.zoneRank,
      anchorScore: r.scores.anchor,
      trust: r.scores.trust,
      yearsInBusiness: r.venue.yearsInBusiness,
    }));
  }

  /** 6 and 7. Schedule and assemble the validated plan. */
  finish(summary?: string, days: Day[] = this.request.options.preferredDays): Plan {
    this.step("schedule", "Building the visit schedule", "running");
    const visits = buildSchedule(
      this.ranked.map((r) => r.venue.id),
      days,
      this.now(),
    );
    this.step("schedule", "Building the visit schedule", "done", `${visits.length} visits over ${new Set(visits.map((v) => v.date)).size} days`);

    const schedRec = this.ledger.append({
      tool: "schedule.build",
      request: { days },
      responseBody: JSON.stringify(visits),
      summary: `${visits.length} visits`,
    });

    const venues: PlanVenue[] = this.ranked.map((r, i) => ({
      rank: i + 1,
      id: r.venue.id,
      name: r.venue.name,
      category: r.venue.category,
      address: r.venue.address,
      city: r.venue.city,
      zip: r.venue.zip,
      lat: r.venue.lat,
      lon: r.venue.lon,
      zoneId: r.venue.zoneId,
      zoneRank: r.zoneRank,
      group: r.group,
      scores: r.scores,
      why: this.why(r),
      verification: {
        status: r.verification,
        source:
          r.verification === "licensed"
            ? r.venue.id.startsWith("qloo-")
              ? "Found by Qloo and matched to a City of Los Angeles business licence"
              : "City of Los Angeles business licence"
            : "Listed by Qloo with an address and map location (no city licence match)",
      },
      ...(this.lovedInfo.has(r.venue.id)
        ? (() => {
            const info = this.lovedInfo.get(r.venue.id)!;
            return { qloo: { entityId: r.venue.id.replace(/^qloo-/, ""), categories: info.categories, tags: info.tags, servesAlcohol: info.servesAlcohol, openDays: info.openDays } };
          })()
        : {}),
      yearsInBusiness: r.venue.yearsInBusiness,
      suggestedDays: days,
      citations: [...(this.candidateTrace.get(r.venue.id) ?? []), schedRec.id],
    }));

    // Citation rule: every cited trace record must exist in this plan's ledger.
    for (const v of venues) {
      const missing = v.citations.filter((id) => !this.ledger.has(id));
      if (missing.length) throw new Error(`plan cites unknown evidence: ${missing.join(", ")}`);
    }

    const byCategory = countBy(venues.map((v) => v.category));
    const plan: Plan = {
      planId: `pln_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      createdAt: this.now().toISOString(),
      mode: {
        trust: this.deps.trust.mode,
        planner: this.deps.planner,
        note:
          this.deps.trust.mode === "qloo"
            ? "Half the plan is barbershops and salons from city licence records (the venue type the trial tested). The other half is places this group loves, from Qloo taste data, re-ranked by the group's affinity. All inside high-need neighbourhoods from CDC estimates."
            : "Offline mode: places come from City of Los Angeles business licences and are ranked by need, venue type and years in business. Qloo taste ranking turns on when a Qloo key is added.",
      },
      request: this.request,
      summary: summary ?? this.defaultSummary(venues.length, byCategory),
      zones: this.zoneSummaries(),
      venues,
      visits,
      removed: this.removed,
      counts: { candidates: this.candidates.length, unsuitableRemoved: this.removed.length, categories: byCategory },
      policy: { reframed: this.reframed, message: this.reframed ? REFRAME_MESSAGE : undefined },
      ...(this.localFlavour ? { localFlavour: this.localFlavour } : {}),
      limits: this.limits(),
      trace: { head: this.ledger.head, records: this.ledger.toJSON().length },
    };
    return Plan.parse(plan);
  }

  /** Where a loved place ranks by affinity among all loved places Qloo returned for its zone. */
  private lovedRank(r: Scored): { rank: number; of: number } | null {
    if (!r.trust) return null;
    // Rank among every place Qloo returned in the zone, not only the ones kept.
    const all = this.zoneAffinities.get(r.venue.zoneId) ?? [];
    if (all.length < 2) return null;
    return { rank: all.indexOf(r.trust.affinity) + 1, of: all.length };
  }

  private audienceLabel(): string {
    const ages = this.request.audience.ageGroups.map((g) => AGE_GROUPS[g].label).join(" and ");
    const who = this.request.audience.gender === "male" ? "men" : this.request.audience.gender === "female" ? "women" : "adults";
    return `${who} aged ${ages}`;
  }

  private why(r: Scored): string {
    const z = this.zones.find((x) => x.zone.zoneId === r.venue.zoneId)?.zone;
    const needPart = z
      ? `In zone ${r.zoneRank}, where an estimated ${fmt.format(z.estUntreatedAdults)} adults have high blood pressure without medicine.`
      : "";
    if (r.trust) {
      const info = this.lovedInfo.get(r.venue.id);
      const kind = info?.categories[0] ? withArticle(niceCategory(info.categories[0])) : "A local place";
      const rankAmong = this.lovedRank(r);
      const loved = rankAmong ? ` It is number ${rankAmong.rank} of ${rankAmong.of} places in this zone for ${this.audienceLabel()} (Qloo affinity ${r.trust.affinity.toFixed(2)}).` : ` Qloo affinity for ${this.audienceLabel()}: ${r.trust.affinity.toFixed(2)}.`;
      const tags = info?.tags.length ? ` Known for: ${info.tags.slice(0, 3).join(", ").toLowerCase()}.` : "";
      return `${kind} that ${this.audienceLabel()} here love.${loved}${tags} ${needPart}`.replace(/\s+/g, " ").trim();
    }
    const years = r.venue.yearsInBusiness;
    const tenure =
      years === null ? "" : years >= 1 ? ` open for about ${Math.round(years)} year${Math.round(years) === 1 ? "" : "s"}` : " opened in the last year";
    return `${withArticle(niceCategory(r.venue.category))}${tenure}. ${needPart}`.trim();
  }

  private defaultSummary(n: number, byCategory: Record<string, number>): string {
    const cats = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([c, k]) => `${k} ${plural(niceCategory(c), k)}`)
      .join(", ");
    const people = this.zones.reduce((s, z) => s + z.zone.estUntreatedAdults, 0);
    return `${n} places in ${this.zones.length} high-need zones, where about ${fmt.format(people)} adults have high blood pressure without medicine: ${cats}. ${this.removed.length} unsuitable places were left out.`;
  }

  private limits(): string[] {
    const out = [
      "CDC PLACES figures are model-based estimates from a national survey, not counts of patients.",
      "Business data comes from businesses registered with the City of Los Angeles (active licences), which covers the city and some neighbouring areas; some businesses may have closed.",
    ];
    if (this.skippedZones > 0) {
      out.push(`${this.skippedZones} higher-need zones were skipped because we do not yet have business data there (they are outside the City of Los Angeles).`);
    }
    out.push(
      this.deps.trust.mode === "qloo"
        ? "Qloo affinity shows what a group likes, not how many people visit."
        : "Without Qloo, Anchor cannot tell which places people love; ranking used need, venue type and years in business.",
    );
    out.push("Suggested days are a starting point. Confirm opening hours and permission with each owner.");
    return out;
  }
}

function countBy(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i] = (out[i] ?? 0) + 1;
  return out;
}

function plural(word: string, n: number): string {
  if (n === 1) return word;
  if (word.endsWith("shop")) return word + "s";
  if (word.endsWith("y") && !word.endsWith("ay")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s")) return word + "es";
  if (word.endsWith("centre")) return word + "s";
  return word + "s";
}

/** Words that keep their capital letter in a category name (nationalities, cuisines, places). */
const PROPER =
  /^(American|Mexican|Honduran|Salvadoran|Guatemalan|Central|Latin|South|Korean|Chinese|Thai|Japanese|Vietnamese|Filipino|Indian|Italian|French|Greek|Cajun|Caribbean|Ethiopian|Jamaican|Cuban|Peruvian|Mediterranean|Middle|Eastern|Asian|African|Armenian|Persian|Hawaiian|Southern|Tex-Mex|New|Los|Angeles)$/;

/** "Mexican restaurant" keeps its capital; "Beauty salon" becomes "beauty salon". */
export function niceCategory(c: string): string {
  return c
    .split(" ")
    .map((w) => (PROPER.test(w) ? w : w.toLowerCase()))
    .join(" ");
}

function withArticle(phrase: string): string {
  return `${/^[aeiou]/i.test(phrase) ? "An" : "A"} ${phrase}`;
}
