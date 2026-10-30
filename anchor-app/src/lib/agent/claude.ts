import { county } from "@/lib/domain/counties";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { PlanBuilder, type BuilderDeps } from "@/lib/agent/builder";
import { runBasicPlanner } from "@/lib/agent/basic";
import { mentionsProtectedGroup, REFRAME_MESSAGE } from "@/lib/domain/policy";
import { DAYS, GOALS, AGE_GROUPS, type Plan, type PlanRequest } from "@/lib/domain/types";

/**
 * Claude agent. The model decides how to plan (how many zones, which venue
 * types to leave out, how many places, which days) and writes the summary. It
 * never ranks venues itself: the published formula does, through the same
 * PlanBuilder steps the basic planner uses. Every tool input is validated.
 *
 * Model: Claude Opus 5.5, with server-side refusal fallbacks enabled. If the
 * model is unavailable or declines, the basic planner finishes the plan.
 */

export const AGENT_MODEL = "claude-opus-5-5";
const MAX_TURNS = 10;

/** The narrow slice of the SDK the agent uses, so tests can pass a fake. */
export type AgentClient = {
  beta: { messages: { create: (params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming) => Promise<Anthropic.Beta.Messages.BetaMessage> } };
};

export function makeAnthropicClient(apiKey: string): AgentClient {
  // Explicit base URL: never inherit an unrelated ANTHROPIC_BASE_URL from the environment.
  return new Anthropic({ apiKey, baseURL: process.env.ANCHOR_ANTHROPIC_BASE_URL ?? "https://api.anthropic.com" });
}

const Inputs = {
  select_zones: z.object({ count: z.number().int().min(1).max(30) }).strict(),
  find_places: z.object({}).strict(),
  check_suitability: z.object({ exclude_categories: z.array(z.string().max(40)).max(12) }).strict(),
  rank_places: z.object({ max_venues: z.number().int().min(3).max(40) }).strict(),
  finish_plan: z
    .object({
      summary: z.string().min(20).max(600),
      preferred_days: z.array(z.enum(DAYS)).min(1).max(7),
    })
    .strict(),
};
type ToolName = keyof typeof Inputs;

const TOOLS: Anthropic.Beta.Messages.BetaTool[] = [
  {
    name: "select_zones",
    description:
      "Pick the highest-need zones in the county: groups of neighbourhoods where CDC estimates show the most adults with high blood pressure and no medicine. Returns each zone's rank, estimated untreated adults, area and number of candidate venues. Call this first.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { count: { type: "integer", description: "How many zones to plan for, 1 to 30. Usually 6 to 10." } },
      required: ["count"],
      additionalProperties: false,
    },
  },
  {
    name: "find_places",
    description:
      "Find candidate venues in the selected zones. With a Qloo key, these are places the audience loves (Qloo taste data) matched to licensed businesses; without one, licensed local businesses only. Returns counts per category and whether Qloo was used.",
    strict: true,
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_suitability",
    description:
      "Remove places that are not right for health outreach (bars, liquor stores and similar are always removed) and any categories you choose to leave out, for example if the request says to avoid restaurants.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        exclude_categories: {
          type: "array",
          items: { type: "string" },
          description: "Extra venue categories to leave out, using names from find_places. Empty list if none.",
        },
      },
      required: ["exclude_categories"],
      additionalProperties: false,
    },
  },
  {
    name: "rank_places",
    description:
      "Rank candidates with Anchor's published formula (need, trust, evidence, practicality) and diversity rules. You choose how many places; the formula chooses which. Returns the ranked list.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { max_venues: { type: "integer", description: "How many places to include, 3 to 40. Usually 8 to 15." } },
      required: ["max_venues"],
      additionalProperties: false,
    },
  },
  {
    name: "finish_plan",
    description:
      "Finish the plan with a short plain-English summary for a community health worker and the days to hold visits. Call this last, exactly once.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "2 to 3 plain sentences: where, how many places, what kinds, and one practical tip. No jargon.",
        },
        preferred_days: { type: "array", items: { type: "string", enum: [...DAYS] }, description: "Days for visits." },
      },
      required: ["summary", "preferred_days"],
      additionalProperties: false,
    },
  },
];

function systemPrompt(request: PlanRequest, trustMode: "qloo" | "offline"): string {
  const ages = request.audience.ageGroups.map((g) => AGE_GROUPS[g].label).join(" and ");
  return [
    "You are Anchor's outreach planner. You help community health workers decide where to hold free blood pressure checks: at trusted local venues in the neighbourhoods where the most adults have high blood pressure without medicine.",
    "",
    "How to work: call select_zones, then find_places, then check_suitability, then rank_places, then finish_plan. Adjust counts to the request, then finish. Do not invent venues, numbers or facts; everything you say must come from tool results.",
    "",
    "Rules you must follow:",
    "- Plan by neighbourhood need, age and gender only. Never target, describe or infer people by race, ethnicity, religion, national origin or immigration status, even if asked. If asked, plan by need instead and say so politely in the summary.",
    "- Never give medical advice.",
    "- Write for a busy health worker: plain words, short sentences, no jargon, no emojis, and no dashes used as punctuation.",
    "",
    `Request defaults: goal "${GOALS[request.goal].label}", audience ${request.audience.gender === "any" ? "adults" : request.audience.gender === "male" ? "men" : "women"} aged ${ages}, ${county(request.area.countyFips).name}, about ${request.options.zones} zones and ${request.options.maxVenues} places, preferred days ${request.options.preferredDays.join(" and ")}.`,
    `Taste data: ${trustMode === "qloo" ? "Qloo is connected." : "Qloo is not connected yet, so venues are ranked without taste data. Mention this briefly in the summary."}`,
  ].join("\n");
}

export async function runClaudeAgent(
  request: PlanRequest,
  deps: Omit<BuilderDeps, "planner"> & { client: AgentClient },
): Promise<{ plan: Plan; builder: PlanBuilder }> {
  const b = new PlanBuilder(request, { ...deps, planner: "claude" });
  b.step("policy", "Checking the request against Anchor's targeting policy", "running");
  const { reframed } = b.checkPolicy();
  b.step(
    "policy",
    "Checking the request against Anchor's targeting policy",
    "done",
    reframed ? "Reframed: planning by neighbourhood need, age and gender" : "Plans by neighbourhood need, age and gender",
  );

  const userText = [
    request.prompt ? `Request from the health worker: ${request.prompt}` : "Make a plan with the defaults.",
    reframed ? `Policy note: ${REFRAME_MESSAGE}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: userText }];
  let summary: string | undefined;
  let days = request.options.preferredDays;
  let finished = false;
  // Which tools the model chose, in order: recorded in the evidence log as proof the agent ran.
  const chosen: string[] = [];
  let turns = 0;

  try {
    b.step("agent", "Claude is planning", "running");
    for (let turn = 0; turn < MAX_TURNS && !finished; turn++) {
      turns = turn + 1;
      const res = await deps.client.beta.messages.create({
        model: AGENT_MODEL,
        max_tokens: 16000,
        system: systemPrompt(request, deps.trust.mode),
        tools: TOOLS,
        messages,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });

      if (res.stop_reason === "refusal") throw new Error("the model declined this request");
      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      const calls = res.content.filter((c): c is Anthropic.Beta.Messages.BetaToolUseBlock => c.type === "tool_use");
      if (calls.length === 0) break; // ended without finish_plan; we finish below
      if (res.stop_reason === "max_tokens") throw new Error("tool input was cut off");

      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
      for (const call of calls) {
        const name = call.name as ToolName;
        chosen.push(call.name);
        const schema = Inputs[name];
        const parsed = schema ? schema.safeParse(call.input) : null;
        if (!parsed || !parsed.success) {
          results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: `Invalid input for ${call.name}.` });
          continue;
        }
        try {
          const out = await runTool(b, name, parsed.data as never);
          if (name === "finish_plan") {
            const input = parsed.data as z.infer<typeof Inputs.finish_plan>;
            summary = input.summary;
            days = input.preferred_days;
            finished = true;
          }
          results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(out) });
        } catch (err) {
          results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: (err as Error).message });
        }
      }
      messages.push({ role: "user", content: results });
    }
    b.step("agent", "Claude is planning", "done", finished ? "Plan finished by Claude" : "Claude stopped early; finishing with the standard steps");
    b.ledger.append({
      tool: "agent.claude",
      request: { model: AGENT_MODEL, turns, tools: chosen },
      responseBody: JSON.stringify({ finished, summary: summary ?? null }),
      summary: `Planned by the Claude agent (${AGENT_MODEL}) in ${turns} turns. It called ${chosen.length} tools: ${chosen.join(", ")}.`,
    });
  } catch (err) {
    // Model unavailable or declined: the basic planner produces the plan instead.
    b.step("agent", "Claude is planning", "error", `${(err as Error).message}. Using the basic planner instead.`);
    return runBasicPlanner(request, { trust: deps.trust, emit: deps.emit, now: deps.now });
  }

  // Make sure every step ran even if the model skipped one.
  if (b.zoneSummaries().length === 0) await b.selectZones(request.options.zones);
  if (b.rankedPreview().length === 0) {
    await b.findPlaces();
    b.checkSuitability();
    b.rank();
  }
  await b.flavour();
  // Output check: drop any summary that mentions a protected group.
  if (summary && mentionsProtectedGroup(summary)) summary = undefined;
  return { plan: b.finish(summary, days), builder: b };
}

async function runTool(b: PlanBuilder, name: ToolName, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "select_zones":
      return { zones: await b.selectZones(input.count as number) };
    case "find_places":
      return await b.findPlaces();
    case "check_suitability":
      return b.checkSuitability(input.exclude_categories as string[]);
    case "rank_places": {
      const r = b.rank(input.max_venues as number);
      return { ...r, places: b.rankedPreview() };
    }
    case "finish_plan":
      return { ok: true };
  }
}
