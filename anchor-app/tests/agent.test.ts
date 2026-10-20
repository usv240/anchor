import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { runClaudeAgent, AGENT_MODEL, type AgentClient } from "@/lib/agent/claude";
import { OfflineTrust } from "@/lib/domain/trust";
import { PlanRequest, type PlanEvent } from "@/lib/domain/types";

type Msg = Anthropic.Beta.Messages.BetaMessage;
type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

let n = 0;
const toolUse = (name: string, input: unknown) => ({ type: "tool_use" as const, id: `tu_${++n}`, name, input });
const reply = (content: unknown[], stop: string = "tool_use") => ({ content, stop_reason: stop }) as unknown as Msg;

/** A fake Claude that plays back a scripted conversation and records every request. */
function scripted(turns: Msg[]): AgentClient & { requests: Params[] } {
  const requests: Params[] = [];
  return {
    requests,
    beta: {
      messages: {
        create: async (params: Params) => {
          requests.push(structuredClone(params));
          const next = turns.shift();
          if (!next) throw new Error("script ran out");
          return next;
        },
      },
    },
  };
}

const NOW = () => new Date("2026-10-17T12:00:00Z");

async function run(client: AgentClient, prompt?: string) {
  const events: PlanEvent[] = [];
  const request = PlanRequest.parse({ prompt });
  const out = await runClaudeAgent(request, { trust: new OfflineTrust(), client, emit: (e) => events.push(e), now: NOW });
  return { ...out, events };
}

describe("Claude agent", () => {
  it("plans through the tools and uses the model's choices and summary", async () => {
    const client = scripted([
      reply([toolUse("select_zones", { count: 5 })]),
      reply([toolUse("find_places", {})]),
      reply([toolUse("check_suitability", { exclude_categories: ["Restaurant"] })]),
      reply([toolUse("rank_places", { max_venues: 9 })]),
      reply([
        toolUse("finish_plan", {
          summary: "Nine places across five high-need zones in South Los Angeles. Start with the barbershops on Saturday mornings.",
          preferred_days: ["saturday"],
        }),
      ]),
    ]);
    const { plan } = await run(client, "Saturday checks for men, no restaurants");
    expect(plan.mode.planner).toBe("claude");
    expect(plan.zones).toHaveLength(5);
    expect(plan.venues).toHaveLength(9);
    expect(plan.venues.some((v) => v.category === "Restaurant")).toBe(false);
    expect(plan.summary).toMatch(/^Nine places/);
    expect(new Set(plan.visits.map((v) => v.day))).toEqual(new Set(["saturday"]));
  });

  it("calls the current model with refusal fallbacks and strict tools", async () => {
    const client = scripted([reply([{ type: "text", text: "done" }], "end_turn")]);
    await run(client);
    const req = client.requests[0];
    expect(req.model).toBe(AGENT_MODEL);
    expect(req.fallbacks).toBe("default");
    expect(req.betas).toContain("server-side-fallback-2026-07-01");
    expect(req.tool_choice).toBeUndefined(); // forced tool use is not allowed on this model
    expect((req.tools as { strict?: boolean }[]).every((t) => t.strict)).toBe(true);
  });

  it("returns tool errors for invalid input instead of running the tool", async () => {
    const client = scripted([
      reply([toolUse("select_zones", { count: 999 })]),
      reply([{ type: "text", text: "ok" }], "end_turn"),
    ]);
    const { plan } = await run(client);
    const second = client.requests[1].messages.at(-1)!;
    const block = (second.content as Anthropic.Beta.Messages.BetaToolResultBlockParam[])[0];
    expect(block.is_error).toBe(true);
    expect(plan.venues.length).toBeGreaterThan(0); // finished with the standard steps
  });

  it("falls back to the basic planner when the model declines", async () => {
    const client = scripted([reply([], "refusal")]);
    const { plan, events } = await run(client);
    expect(plan.mode.planner).toBe("basic");
    expect(events.some((e) => e.type === "step" && e.id === "agent" && e.status === "error")).toBe(true);
  });

  it("falls back to the basic planner when the API fails", async () => {
    const client: AgentClient = {
      beta: {
        messages: {
          create: async () => {
            throw new Error("connection failed");
          },
        },
      },
    };
    const { plan } = await run(client);
    expect(plan.mode.planner).toBe("basic");
    expect(plan.venues.length).toBeGreaterThan(0);
  });

  it("reframes protected-group requests and tells the model", async () => {
    const client = scripted([reply([{ type: "text", text: "ok" }], "end_turn")]);
    const { plan } = await run(client, "find barbershops Black men like");
    expect(plan.policy.reframed).toBe(true);
    expect(JSON.stringify(client.requests[0].messages[0].content)).toMatch(/Policy note/);
  });

  it("drops a model summary that mentions a protected group", async () => {
    const client = scripted([
      reply([toolUse("select_zones", { count: 3 })]),
      reply([toolUse("finish_plan", { summary: "Great places for Latino families in these zones today.", preferred_days: ["friday"] })]),
    ]);
    const { plan } = await run(client);
    expect(plan.summary).not.toMatch(/Latino/);
  });
});
