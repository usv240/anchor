/**
 * Anchor MCP server (stdio). Lets any MCP client (Claude Desktop, Claude Code
 * and others) use Anchor as tools. It calls the public Anchor API, so it works
 * against a local dev server or the hosted site.
 *
 * Env: ANCHOR_URL (default http://localhost:3000), ANCHOR_API_KEY (default anc_demo).
 * Run: npx tsx scripts/mcp.mts
 * stdout carries the MCP protocol; all logging goes to stderr.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.ANCHOR_URL ?? "http://localhost:3000").replace(/\/$/, "");
const KEY = process.env.ANCHOR_API_KEY ?? "anc_demo";
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Anchor API answered ${res.status}`);
  return body as T;
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (e: unknown) => ({ ...text(`Anchor could not do that: ${(e as Error).message}`), isError: true });

type Plan = {
  planId: string;
  summary: string;
  mode: { trust: string; planner: string; note: string };
  venues: { rank: number; name: string; category: string; address: string; city: string; zip: string; scores: { anchor: number }; why: string; qloo?: { entityId: string } }[];
  limits: string[];
  policy: { reframed: boolean; message?: string };
};

const server = new McpServer({ name: "anchor", version: "1.0.0" });

server.registerTool(
  "anchor_need_map",
  {
    title: "High-need neighbourhoods",
    description:
      "List the zones in Los Angeles County where CDC estimates show the most adults with high blood pressure who are not taking medicine. Model-based estimates, not patient counts.",
    inputSchema: { top: z.number().int().min(1).max(50).default(10).describe("How many zones to return") },
  },
  async ({ top }) => {
    try {
      const r = await api<{ summary: { estUntreatedAdults: number; tracts: number }; zones: { rank: number; zoneId: string; estUntreatedAdults: number; areaKm2: number }[] }>("/api/v1/need");
      const lines = r.zones.slice(0, top).map((z) => `${z.rank}. ${z.zoneId}: about ${z.estUntreatedAdults.toLocaleString("en-US")} untreated adults, ${z.areaKm2} sq km`);
      return text(`Los Angeles County: about ${r.summary.estUntreatedAdults.toLocaleString("en-US")} adults with untreated high blood pressure across ${r.summary.tracts} census tracts (CDC PLACES estimates).\n\nTop zones:\n${lines.join("\n")}`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "anchor_plan_outreach",
  {
    title: "Plan blood pressure outreach",
    description:
      "Create an outreach plan: trusted local venues (barbershops, salons, laundromats and more) in the highest-need neighbourhoods of Los Angeles County, ranked by a published formula, with a visit schedule. Plans by need, age and gender only; never targets by race, ethnicity or religion.",
    inputSchema: {
      age_groups: z.array(z.enum(["18_to_34", "35_to_54", "55_plus"])).min(1).default(["35_to_54"]),
      gender: z.enum(["any", "male", "female"]).default("any"),
      zones: z.number().int().min(1).max(30).default(8),
      max_places: z.number().int().min(3).max(40).default(12),
      days: z.array(z.enum(DAYS)).min(1).default(["saturday"]),
      leave_out: z.array(z.string()).default([]).describe("Venue types to leave out, for example Restaurant"),
      request: z.string().max(600).optional().describe("Optional request in plain words"),
    },
  },
  async (a) => {
    try {
      const plan = await api<Plan>("/api/v1/plans?stream=false", {
        method: "POST",
        body: JSON.stringify({
          audience: { ageGroups: a.age_groups, gender: a.gender },
          options: { zones: a.zones, maxVenues: a.max_places, preferredDays: a.days, excludeCategories: a.leave_out },
          ...(a.request ? { prompt: a.request } : {}),
        }),
      });
      const list = plan.venues.map((v) => `${v.rank}. ${v.name} (${v.category}), ${v.address}, ${v.city} ${v.zip}. Score ${v.scores.anchor.toFixed(2)}. ${v.why}${v.qloo ? ` Qloo id: ${v.qloo.entityId}` : ""}`);
      return text(
        [
          plan.policy.reframed ? `Note: ${plan.policy.message}` : "",
          plan.summary,
          "",
          ...list,
          "",
          `Mode: ${plan.mode.note}`,
          `Limits: ${plan.limits.join(" ")}`,
          "",
          `Plan id: ${plan.planId}`,
          `Open: ${BASE}/app?plan=${plan.planId}`,
          `Calendar: ${BASE}/api/v1/plans/${plan.planId}/export/ics`,
          `Spreadsheet: ${BASE}/api/v1/plans/${plan.planId}/export/csv`,
        ]
          .filter((l, i) => l !== "" || i > 0)
          .join("\n"),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "anchor_get_plan",
  {
    title: "Get a saved plan",
    description: "Fetch a plan made earlier by its id, with links to download it as a calendar file, spreadsheet or map file.",
    inputSchema: { plan_id: z.string().regex(/^pln_[a-z0-9]{16}$/) },
  },
  async ({ plan_id }) => {
    try {
      const plan = await api<Plan>(`/api/v1/plans/${plan_id}`);
      return text(
        `${plan.summary}\n\n${plan.venues.map((v) => `${v.rank}. ${v.name}, ${v.address}, ${v.city}`).join("\n")}\n\nDownloads: ${["csv", "ics", "geojson"].map((f) => `${BASE}/api/v1/plans/${plan_id}/export/${f}`).join(" ")}`,
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "anchor_place_fans",
  {
    title: "Where a place's fans are",
    description:
      "For a Qloo place id (shown in plans as 'Qloo id'), how many of its 20 strongest fan areas are high-need neighbourhoods for untreated high blood pressure. Use it to check that a venue draws people from the areas the checks are for. About 1 in 5 neighbourhoods is high need, so well above 4 of 20 is a good sign.",
    inputSchema: { place_id: z.string().regex(/^[0-9A-Fa-f-]{36}$/) },
  },
  async ({ place_id }) => {
    try {
      const r = await api<{ highNeedAreas: number; areas: unknown[]; via: string }>(`/api/v1/places/${place_id}/fans`);
      return text(`${r.highNeedAreas} of its ${r.areas.length} strongest fan areas are high-need neighbourhoods (source: Qloo heatmap, via ${r.via}).`);
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "anchor_reading_corner",
  {
    title: "Children's books for a barbershop reading corner",
    description:
      "Up to 4 things the kids who visit love (games, shows, films, stars). Returns children's books Qloo links to them, each checked as a children's book. Also says which interests shaped no books.",
    inputSchema: { interests: z.array(z.string().min(1).max(60)).min(1).max(4) },
  },
  async ({ interests }) => {
    try {
      const r = await api<{ books: { title: string; publisher: string | null; year: number | null; because: string[] }[]; unused: string[] }>("/api/v1/books", {
        method: "POST",
        body: JSON.stringify({ interests, take: 6 }),
      });
      const lines = r.books.map((b, i) => `${i + 1}. ${b.title}${b.publisher ? `, ${b.publisher}` : ""}${b.year ? ` (${b.year})` : ""}${b.because.length ? `, mostly for fans of ${b.because[0]}` : ""}`);
      const note = r.unused.length ? `\n\nQloo found no book links for ${r.unused.join(" or ")}.` : "";
      return text((lines.length ? lines.join("\n") : "No children's books passed the checks for these interests.") + note);
    } catch (e) {
      return fail(e);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Anchor MCP server ready (API: ${BASE})`);
