import { gate, problem } from "@/lib/api/http";
import { runPlan } from "@/lib/api/run";
import { PlanRequest, type PlanEvent } from "@/lib/domain/types";

/**
 * POST /api/v1/plans
 * Body: PlanRequest (JSON). Optional header X-Qloo-Key (bring your own key).
 * Default response: a stream of newline-delimited JSON events
 * (application/x-ndjson): step events, then one { type: "plan" } event.
 * Add ?stream=false to get the finished plan as one JSON response.
 */
export async function POST(req: Request) {
  const g = await gate(req);
  if (g instanceof Response) return g;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return problem(400, "The request body must be JSON.");
  }
  const parsed = PlanRequest.safeParse(body ?? {});
  if (!parsed.success) {
    return problem(400, "Some fields are not valid.", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  // BYOK: used for this request only; never stored or logged (shared/PLATFORM.md section 8).
  const byokQlooKey = req.headers.get("x-qloo-key")?.trim() || undefined;
  const planner = new URL(req.url).searchParams.get("planner") === "basic" ? "basic" : "auto";

  if (new URL(req.url).searchParams.get("stream") === "false") {
    try {
      const plan = await runPlan(parsed.data, { emit: () => {}, byokQlooKey, planner });
      return Response.json(plan, { status: 201, headers: g.headers });
    } catch (err) {
      return problem(502, `The plan could not be finished: ${(err as Error).message}`);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PlanEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const plan = await runPlan(parsed.data, { emit: send, byokQlooKey, planner });
        send({ type: "plan", plan });
      } catch (err) {
        send({ type: "error", message: `The plan could not be finished: ${(err as Error).message}` });
      } finally {
        controller.close();
      }
    },
  });
  g.headers.set("Content-Type", "application/x-ndjson; charset=utf-8");
  g.headers.set("Cache-Control", "no-store");
  return new Response(stream, { status: 200, headers: g.headers });
}
