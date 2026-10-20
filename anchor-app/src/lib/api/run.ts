import { runBasicPlanner } from "@/lib/agent/basic";
import { makeAnthropicClient, runClaudeAgent } from "@/lib/agent/claude";
import { makeTrustProvider } from "@/lib/domain/trust";
import type { Plan, PlanEvent, PlanRequest } from "@/lib/domain/types";
import { TraceLedger } from "@/lib/trace/ledger";
import { savePlan } from "@/lib/store";
import { sharedQlooCache } from "@/lib/qloo/fileCache";
import { take } from "@/lib/api/budget";

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
  // Hosted keys have a daily allowance (lib/api/budget.ts); your own Qloo key does not.
  const hostedQloo = !opts.byokQlooKey && Boolean(process.env.QLOO_API_KEY);
  const qlooAllowed = !hostedQloo || take("qloo");
  const qlooKey = opts.byokQlooKey || (qlooAllowed ? process.env.QLOO_API_KEY : undefined) || undefined;
  const trust = makeTrustProvider({ qlooKey, byok: Boolean(opts.byokQlooKey), ledger, cache: sharedQlooCache() });
  const anthropicKey = process.env.ANTHROPIC_API_KEY && opts.planner !== "basic" && take("claude") ? process.env.ANTHROPIC_API_KEY : undefined;
  if (hostedQloo && !qlooAllowed) {
    opts.emit({ type: "step", id: "budget", label: "Checking today's Qloo allowance", status: "skipped", detail: "Today's shared Qloo allowance for this demo is used up, so this plan runs in offline mode. Add your own Qloo key under More options to use Qloo now." });
  }
  if (process.env.ANTHROPIC_API_KEY && opts.planner !== "basic" && !anthropicKey) {
    opts.emit({ type: "step", id: "budget-ai", label: "Checking today's AI allowance", status: "skipped", detail: "Today's shared AI allowance for this demo is used up, so the basic planner makes this plan. It uses the same data and formula." });
  }

  const { plan, builder } =
    anthropicKey
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
