import { problem } from "@/lib/api/http";
import { createKey, rateLimit } from "@/lib/api/keys";

/** POST /api/v1/keys: create an API key. It is shown once; only a hash is kept. */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`keys:${ip}`, 3, 24 * 60 * 60 * 1000).ok) {
    return problem(429, "You can create up to 3 keys a day.");
  }
  let label = "my key";
  try {
    const body = (await req.json()) as { label?: unknown };
    if (typeof body.label === "string") label = body.label;
  } catch {
    // no body is fine
  }
  const key = await createKey(label);
  return Response.json(
    { ...key, note: "Save this key now. For your security it will not be shown again." },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
