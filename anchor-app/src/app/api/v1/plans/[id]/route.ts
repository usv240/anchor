import { problem } from "@/lib/api/http";
import { getPlan } from "@/lib/store";

/** GET /api/v1/plans/{id}: the finished plan. */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/plans/[id]">) {
  const { id } = await ctx.params;
  const stored = await getPlan(id);
  return stored ? Response.json(stored.plan) : problem(404, "No plan with that id. Plans are kept for a limited time.");
}
