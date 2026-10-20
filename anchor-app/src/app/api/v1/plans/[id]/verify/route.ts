import { problem } from "@/lib/api/http";
import { getPlan } from "@/lib/store";
import { verifyChain } from "@/lib/trace/ledger";

/** GET /api/v1/plans/{id}/verify: recompute the hash chain and check every citation exists. */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/plans/[id]/verify">) {
  const { id } = await ctx.params;
  const stored = await getPlan(id);
  if (!stored) return problem(404, "No plan with that id.");
  const chain = verifyChain(stored.trace);
  const ids = new Set(stored.trace.map((r) => r.id));
  const missing = stored.plan.venues.flatMap((v) => v.citations.filter((c) => !ids.has(c)).map((c) => `${v.id}:${c}`));
  const headMatches = stored.trace.at(-1)?.hash === stored.plan.trace.head;
  return Response.json({
    planId: id,
    valid: chain.valid && missing.length === 0 && headMatches,
    chain,
    headMatches,
    missingCitations: missing,
    records: stored.trace.length,
  });
}
