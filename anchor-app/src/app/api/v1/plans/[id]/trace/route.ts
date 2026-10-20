import { problem } from "@/lib/api/http";
import { getPlan } from "@/lib/store";

/** GET /api/v1/plans/{id}/trace: every recorded step behind the plan (no keys, no raw Qloo data). */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/plans/[id]/trace">) {
  const { id } = await ctx.params;
  const stored = await getPlan(id);
  return stored ? Response.json({ planId: id, head: stored.plan.trace.head, records: stored.trace }) : problem(404, "No plan with that id.");
}
