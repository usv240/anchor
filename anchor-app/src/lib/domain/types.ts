import { z } from "zod";

/**
 * The plan contract. One schema serves the web app, the REST API, the MCP
 * tools and the agent (shared/PLATFORM.md section 5: "every tool input and
 * output is schema-validated").
 */

export const AGE_GROUPS = {
  "18_to_34": { label: "18 to 34", qloo: ["24_and_younger", "25_to_29", "30_to_34"] },
  "35_to_54": { label: "35 to 54", qloo: ["35_to_44", "45_to_54"] },
  "55_plus": { label: "55 and older", qloo: ["55_and_older"] },
} as const;
export type AgeGroup = keyof typeof AGE_GROUPS;

export const GOALS = {
  bp_screening: { label: "Free blood pressure checks" },
  bp_followup: { label: "Blood pressure follow-up and medicine support" },
} as const;
export type Goal = keyof typeof GOALS;

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Day = (typeof DAYS)[number];

export const PlanRequest = z
  .object({
    goal: z.enum(Object.keys(GOALS) as [Goal, ...Goal[]]).default("bp_screening"),
    audience: z
      .object({
        ageGroups: z
          .array(z.enum(Object.keys(AGE_GROUPS) as [AgeGroup, ...AgeGroup[]]))
          .min(1)
          .default(["35_to_54"]),
        gender: z.enum(["male", "female", "any"]).default("any"),
      })
      .strict()
      .default({ ageGroups: ["35_to_54"], gender: "any" }),
    area: z
      .object({ countyFips: z.literal("06037").default("06037") })
      .strict()
      .default({ countyFips: "06037" }),
    options: z
      .object({
        zones: z.number().int().min(1).max(30).default(8),
        maxVenues: z.number().int().min(3).max(40).default(12),
        preferredDays: z.array(z.enum(DAYS)).min(1).max(7).default(["saturday", "friday"]),
        excludeCategories: z.array(z.string().max(40)).max(12).default([]),
      })
      .strict()
      .default({ zones: 8, maxVenues: 12, preferredDays: ["saturday", "friday"], excludeCategories: [] }),
    /** Optional free-text request, used by the agent (Claude) mode only. */
    prompt: z.string().max(600).optional(),
  })
  .strict();
export type PlanRequest = z.infer<typeof PlanRequest>;

export const Scores = z.object({
  anchor: z.number(),
  need: z.number(),
  trust: z.number().nullable(),
  evidence: z.number(),
  feasible: z.number(),
});

export const PlanVenue = z.object({
  rank: z.number().int(),
  id: z.string(),
  name: z.string(),
  category: z.string(),
  address: z.string(),
  city: z.string(),
  zip: z.string(),
  lat: z.number(),
  lon: z.number(),
  zoneId: z.string(),
  zoneRank: z.number().int(),
  /** trial: barbershops and salons (the venue type the NEJM trial tested). community: places this group loves (Qloo) or, offline, other licensed local businesses. */
  group: z.enum(["trial", "community"]),
  scores: Scores,
  why: z.string(),
  verification: z.object({
    status: z.enum(["licensed", "qloo_only"]),
    source: z.string(),
  }),
  /** Present for places that came from Qloo. Only allowlisted community tags are kept. */
  qloo: z
    .object({
      entityId: z.string(),
      categories: z.array(z.string()),
      tags: z.array(z.string()),
      servesAlcohol: z.boolean(),
      openDays: z.array(z.enum(DAYS)).nullable(),
    })
    .optional(),
  yearsInBusiness: z.number().nullable(),
  suggestedDays: z.array(z.enum(DAYS)),
  citations: z.array(z.string()).min(1),
});
export type PlanVenue = z.infer<typeof PlanVenue>;

export const PlanZone = z.object({
  zoneId: z.string(),
  rank: z.number().int(),
  need: z.number(),
  estUntreatedAdults: z.number(),
  adults: z.number(),
  areaKm2: z.number(),
  centroid: z.tuple([z.number(), z.number()]),
  candidateVenues: z.number(),
});
export type PlanZone = z.infer<typeof PlanZone>;

export const Visit = z.object({
  venueId: z.string(),
  day: z.enum(DAYS),
  date: z.string(),
  start: z.string(),
  end: z.string(),
});
export type Visit = z.infer<typeof Visit>;

export const Plan = z.object({
  planId: z.string(),
  createdAt: z.string(),
  mode: z.object({
    trust: z.enum(["qloo", "offline"]),
    planner: z.enum(["claude", "basic"]),
    note: z.string(),
  }),
  request: PlanRequest,
  summary: z.string(),
  zones: z.array(PlanZone),
  venues: z.array(PlanVenue),
  visits: z.array(Visit),
  removed: z.array(z.object({ name: z.string(), category: z.string(), reason: z.string() })),
  counts: z.object({
    candidates: z.number(),
    unsuitableRemoved: z.number(),
    categories: z.record(z.string(), z.number()),
  }),
  policy: z.object({ reframed: z.boolean(), message: z.string().optional() }),
  /** Taste analysis around the top zone (Qloo), for flyers and conversations. Absent offline. */
  localFlavour: z.object({ zoneId: z.string(), tags: z.array(z.object({ name: z.string(), kind: z.string() })), citations: z.array(z.string()) }).optional(),
  limits: z.array(z.string()),
  trace: z.object({ head: z.string(), records: z.number() }),
});
export type Plan = z.infer<typeof Plan>;

export type StepStatus = "running" | "done" | "skipped" | "error";

export type PlanEvent =
  | { type: "step"; id: string; label: string; status: StepStatus; detail?: string }
  | { type: "plan"; plan: Plan }
  | { type: "error"; message: string };
