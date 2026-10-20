import { z } from "zod";
import { gate, problem } from "@/lib/api/http";
import { findBooks, openLibraryChecker } from "@/lib/domain/books";
import { QlooClient, QlooError } from "@/lib/qloo/client";
import { sharedQlooCache } from "@/lib/qloo/fileCache";
import { TraceLedger } from "@/lib/trace/ledger";

const Body = z
  .object({
    interests: z.array(z.string().min(1).max(60)).min(1).max(4),
    take: z.number().int().min(3).max(10).default(6),
  })
  .strict();

/**
 * POST /api/v1/books
 * Body: { "interests": ["Minecraft", "Bluey"], "take": 6 }
 * Children's books that fans of those interests love (Qloo), limited to
 * children's genres, one per series. Optional header X-Qloo-Key (BYOK).
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
  const parsed = Body.safeParse(body);
  if (!parsed.success) return problem(400, "Send 1 to 4 interests, for example { \"interests\": [\"Minecraft\", \"Bluey\"] }.");

  const byok = req.headers.get("x-qloo-key")?.trim();
  const apiKey = byok || process.env.QLOO_API_KEY;
  if (!apiKey) return problem(503, "The reading corner needs Qloo, which is not connected on this server yet.");

  const ledger = new TraceLedger();
  const client = new QlooClient({ apiKey, byok: Boolean(byok), ledger, cache: sharedQlooCache(), budget: 8 });
  try {
    const result = await findBooks(client, parsed.data.interests, parsed.data.take, openLibraryChecker(sharedQlooCache()));
    return Response.json(
      { ...result, trace: { head: ledger.head, records: ledger.toJSON().length } },
      { headers: g.headers },
    );
  } catch (err) {
    return problem(err instanceof QlooError ? 502 : 500, `Books could not be found: ${(err as Error).message}`);
  }
}
