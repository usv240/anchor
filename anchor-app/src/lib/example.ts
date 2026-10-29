import { runBasicPlanner } from "@/lib/agent/basic";
import { OfflineTrust } from "@/lib/domain/trust";
import { PlanRequest } from "@/lib/domain/types";

/**
 * The worked example used on the landing page and on How it works: a real plan
 * for men aged 35 to 54 in Los Angeles County, built from public data only (no
 * Qloo responses are stored), computed at build time.
 */
export async function examplePlan() {
  "use cache";
  const { plan } = await runBasicPlanner(PlanRequest.parse({ audience: { ageGroups: ["35_to_54"], gender: "male" } }), {
    trust: new OfflineTrust(),
    now: () => new Date("2026-10-17T12:00:00Z"),
  });
  return plan;
}
