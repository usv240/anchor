import { PlanBuilder, type BuilderDeps } from "@/lib/agent/builder";
import type { Plan, PlanRequest } from "@/lib/domain/types";

/**
 * Basic planner: the plan steps in a fixed, sensible order. Used when no
 * Anthropic key is configured, and as the fallback if the model is
 * unavailable (shared/PLATFORM.md section 5, "deterministic fallbacks").
 */
export async function runBasicPlanner(request: PlanRequest, deps: Omit<BuilderDeps, "planner">): Promise<{ plan: Plan; builder: PlanBuilder }> {
  const b = new PlanBuilder(request, { ...deps, planner: "basic" });
  b.step("policy", "Checking the request against Anchor's targeting policy", "running");
  const { reframed } = b.checkPolicy();
  b.step(
    "policy",
    "Checking the request against Anchor's targeting policy",
    "done",
    reframed ? "Reframed: planning by neighbourhood need, age and gender" : "Plans by neighbourhood need, age and gender",
  );
  await b.selectZones(request.options.zones);
  await b.findPlaces();
  b.checkSuitability();
  b.rank();
  await b.flavour();
  const plan = b.finish();
  return { plan, builder: b };
}
