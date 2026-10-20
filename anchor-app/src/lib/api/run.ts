import { runBasicPlanner } from "@/lib/agent/basic";
import { makeAnthropicClient, runClaudeAgent } from "@/lib/agent/claude";
import { makeTrustProvider } from "@/lib/domain/trust";
import type { Plan, PlanEvent, PlanRequest } from "@/lib/domain/types";
import { TraceLedger } from "@/lib/trace/ledger";
import { savePlan } from "@/lib/store";
import { sharedQlooCache } from "@/lib/qloo/fileCache";

/**
 * Runs one plan with whatever is configured:
 *   Qloo key (server or BYOK)  -> live taste data, otherwise offline mode
 *   Anthropic key              -> Claude agent, otherwise the basic planner
 */
export async function runPlan(
  request: PlanRequest,
  opts: { emit: (e: PlanEvent) => void; byokQlooKey?: string; planner?: "auto" | "basic" },
): Promise<Plan> {
  const ledger = new TraceLedger();
  const qlooKey = opts.byokQlooKey || process.env.QLOO_API_KEY || undefined;
  const trust = makeTrustProvider({ qlooKey, byok: Boolean(opts.byokQlooKey), ledger, cache: sharedQlooCache() });
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const { plan, builder } =
    anthropicKey && opts.planner !== "basic"
      ? await runClaudeAgent(request, { trust, ledger, emit: opts.emit, client: makeAnthropicClient(anthropicKey) })
      : await runBasicPlanner(request, { trust, ledger, emit: opts.emit });

  // Save the ledger of the builder that produced the plan (a fallback uses its own).
  await savePlan(plan, builder.ledger.toJSON());
  return plan;
}

export function configured() {
  return {
    qloo: Boolean(process.env.QLOO_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}
