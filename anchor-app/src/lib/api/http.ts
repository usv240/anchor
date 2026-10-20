import { identify, rateLimit, type Caller } from "@/lib/api/keys";

/** Shared HTTP helpers for the public API: consistent errors and limits. */

export function problem(status: number, message: string, extra: Record<string, unknown> = {}, headers: HeadersInit = {}) {
  return Response.json({ error: { status, message, ...extra } }, { status, headers });
}

const LIMITS = { web: 20, demo: 10, key: 60 } as const;

/** Identifies the caller and applies the per-minute limit. Returns the caller or an error Response. */
export async function gate(req: Request): Promise<{ caller: Caller; headers: Headers } | Response> {
  const who = await identify(req);
  if ("error" in who) return problem(401, who.error);
  const limit = LIMITS[who.kind];
  const rl = rateLimit(who.id, limit);
  const headers = new Headers({
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(rl.remaining),
    "RateLimit-Reset": String(rl.resetSeconds),
  });
  if (!rl.ok) {
    headers.set("Retry-After", String(rl.resetSeconds));
    return problem(429, "Too many requests. Please wait a minute and try again.", {}, headers);
  }
  return { caller: who, headers };
}
