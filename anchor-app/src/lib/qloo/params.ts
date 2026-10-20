/**
 * Allowed Insights parameters per filter.type, from docs.qloo.com
 * "Available parameters by entity type" and the Insights deep dive.
 *
 * Why this exists: Qloo silently ignores parameters that are not valid for a
 * filter.type (hackathon developer guide), which is the most common cause of
 * empty or misleading results. We refuse to send them instead.
 */

const BASELINE = [
  "filter.type",
  "filter.exclude.entities",
  "filter.exclude.tags",
  "operator.exclude.tags",
  "filter.external.exists",
  "operator.filter.external.exists",
  "filter.parents.types",
  "filter.popularity.min",
  "filter.popularity.max",
  "filter.results.entities",
  "filter.results.entities.query",
  "filter.tags",
  "operator.filter.tags",
  "signal.demographics.age",
  "signal.demographics.age.weight",
  "signal.demographics.gender",
  "signal.demographics.gender.weight",
  "signal.demographics.audiences",
  "signal.demographics.audiences.weight",
  "signal.interests.entities",
  "signal.interests.entities.weight",
  "signal.interests.tags",
  "signal.interests.tags.weight",
  "operator.signal.interests.tags",
  "signal.location",
  "signal.location.query",
  "signal.location.radius",
  "signal.location.weight",
  "bias.trends",
  "feature.explainability",
  "offset",
  "page",
  "take",
] as const;

const LOCATION = [
  "filter.location",
  "filter.location.query",
  "filter.location.radius",
  "filter.location.geohash",
  "filter.exclude.location",
  "filter.exclude.location.query",
  "filter.exclude.location.radius",
  "filter.exclude.location.geohash",
  "filter.geocode.name",
  "filter.geocode.admin1_region",
  "filter.geocode.admin2_region",
  "filter.geocode.country_code",
] as const;

const PLACE = [
  ...LOCATION,
  "bias.quality",
  "sort_by",
  "filter.address",
  "filter.external.tripadvisor.rating.min",
  "filter.external.tripadvisor.rating.max",
  "filter.external.tripadvisor.rating.count.min",
  "filter.external.tripadvisor.rating.count.max",
  "filter.hotel_class.min",
  "filter.hotel_class.max",
  "filter.hours",
  "filter.price_level.min",
  "filter.price_level.max",
  "filter.price_range.from",
  "filter.price_range.to",
  "filter.properties.business_rating.min",
  "filter.properties.business_rating.max",
  "filter.references_brand",
  "operator.filter.references_brand",
  "diversify.by",
  "diversify.take",
] as const;

const HEATMAP = [
  "filter.type",
  "filter.location",
  "filter.location.query",
  "filter.location.radius",
  "heatmap.dimensions",
  "filter.dimensions.hotel_class",
  "filter.dimensions.price_level",
  "output.heatmap.boundary",
  "signal.demographics.age",
  "signal.demographics.age.weight",
  "signal.demographics.audiences",
  "signal.demographics.audiences.weight",
  "signal.demographics.gender",
  "signal.demographics.gender.weight",
  "signal.interests.entities",
  "signal.interests.tags",
  "bias.trends",
  "take",
] as const;

const TAG = [
  "filter.type",
  "filter.tag.types",
  "filter.parents.types",
  "signal.interests.entities",
  "signal.interests.tags",
  "signal.demographics.age",
  "signal.demographics.gender",
  "signal.demographics.audiences",
  "signal.location",
  "signal.location.query",
  "diversify.by",
  "diversify.take",
  "offset",
  "page",
  "take",
] as const;

export const ALLOWED_PARAMS: Record<string, ReadonlySet<string>> = {
  "urn:entity:place": new Set([...BASELINE, ...PLACE]),
  "urn:entity:destination": new Set([...BASELINE, ...LOCATION]),
  "urn:entity:artist": new Set(BASELINE),
  "urn:entity:brand": new Set(BASELINE),
  "urn:entity:podcast": new Set(BASELINE),
  "urn:entity:videogame": new Set(BASELINE),
  "urn:entity:book": new Set([...BASELINE, "filter.publication_year.min", "filter.publication_year.max"]),
  "urn:entity:tv_show": new Set([
    ...BASELINE,
    "filter.content_rating",
    "filter.release_year.min",
    "filter.release_year.max",
    "filter.finale_year.min",
    "filter.finale_year.max",
    "filter.latest_known_year.min",
    "filter.latest_known_year.max",
    "filter.release_country",
    "operator.filter.release_country",
    "filter.rating.min",
    "filter.rating.max",
  ]),
  "urn:entity:movie": new Set([
    ...BASELINE,
    "filter.content_rating",
    "filter.release_year.min",
    "filter.release_year.max",
    "filter.release_country",
    "operator.filter.release_country",
    "filter.rating.min",
    "filter.rating.max",
  ]),
  "urn:heatmap": new Set(HEATMAP),
  "urn:tag": new Set(TAG),
  "urn:demographics": new Set(["filter.type", "signal.interests.entities", "signal.interests.tags"]),
};

/** Anchor never sends these, by policy (anchor/TECHNICAL_DESIGN.md section 8.1). */
export const BLOCKED_AUDIENCE_PREFIXES = ["urn:audience:communities"];

export class QlooParamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QlooParamError";
  }
}

export type InsightParams = Record<string, string | number | boolean>;

/** Throws before any request is sent if a parameter would be silently ignored or breaks policy. */
export function guardInsightParams(params: InsightParams): void {
  const type = params["filter.type"];
  if (typeof type !== "string") throw new QlooParamError("filter.type is required");
  const allowed = ALLOWED_PARAMS[type];
  if (!allowed) throw new QlooParamError(`unsupported filter.type: ${type}`);

  const invalid = Object.keys(params).filter((k) => !allowed.has(k));
  if (invalid.length) {
    throw new QlooParamError(`not valid for ${type} (Qloo would silently ignore them): ${invalid.join(", ")}`);
  }

  const audiences = String(params["signal.demographics.audiences"] ?? "");
  if (BLOCKED_AUDIENCE_PREFIXES.some((p) => audiences.includes(p))) {
    throw new QlooParamError("community audiences are disabled by Anchor's targeting policy");
  }

  const take = params.take;
  if (take !== undefined && (typeof take !== "number" || take < 1 || take > 50)) {
    throw new QlooParamError("take must be a number from 1 to 50");
  }

  const hasSignal = Object.keys(params).some((k) => k.startsWith("signal.") || k.startsWith("filter.tags"));
  const hasLocation = Object.keys(params).some((k) => k.startsWith("filter.location"));
  if (!hasSignal && !hasLocation) {
    throw new QlooParamError("at least one signal or location filter is required");
  }
}

export const QLOO_AGE_BUCKETS = [
  "24_and_younger",
  "25_to_29",
  "30_to_34",
  "35_to_44",
  "45_to_54",
  "55_and_older",
  "35_and_younger",
  "36_to_55",
] as const;
export type QlooAge = (typeof QLOO_AGE_BUCKETS)[number];
