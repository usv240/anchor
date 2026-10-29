import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * API keys (shared/PLATFORM.md section 7.1).
 *
 * A key is signed, not stored: anc_live_<payload>.<signature>, where the
 * signature is an HMAC of the payload with a server secret. Any server can
 * check a key without a database, which matters on serverless hosting, where
 * each request may reach a different machine (a stored key made on one machine
 * was unknown on the next; found Oct 29). The key is shown once; nothing about
 * it is kept on the server. The public demo key is documented and always works.
 *
 * Secret: ANCHOR_KEY_SECRET if set; otherwise derived from the server's own Qloo
 * or Anthropic key, which never leaves the server. Changing it retires all keys.
 */

export const DEMO_KEY = "anc_demo";
const PREFIX = "anc_live_";

function secret(): string {
  const base = process.env.ANCHOR_KEY_SECRET ?? process.env.QLOO_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "anchor-local-development";
  return createHash("sha256").update(`anchor-api-keys:v1:${base}`).digest("hex");
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 32);

export async function createKey(label: string): Promise<{ key: string; label: string; createdAt: string }> {
  const createdAt = new Date().toISOString();
  const clean = label.trim().slice(0, 60) || "my key";
  const payload = b64(JSON.stringify({ l: clean, t: createdAt, n: randomBytes(9).toString("base64url") }));
  return { key: `${PREFIX}${payload}.${sign(payload)}`, label: clean, createdAt };
}

/** The key's id for rate limiting, or null if it is not a valid Anchor key. */
export function verifyKey(key: string): string | null {
  if (!key.startsWith(PREFIX)) return null;
  const [payload, sig] = key.slice(PREFIX.length).split(".");
  if (!payload || !sig || sig.length !== 32) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return sig.slice(0, 12);
}

export type Caller = { kind: "demo" | "key" | "web"; id: string };

/**
 * Who is calling. No Authorization header means the web app (or a quick local
 * test), rate-limited by IP. A Bearer key must be the demo key or a valid key.
 */
export async function identify(req: Request): Promise<Caller | { error: string }> {
  const auth = req.headers.get("authorization");
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!auth) return { kind: "web", id: `ip:${ip}` };
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!m) return { error: "Use the header Authorization: Bearer <your key>." };
  if (m[1] === DEMO_KEY) return { kind: "demo", id: `demo:${ip}` };
  const id = verifyKey(m[1]);
  return id ? { kind: "key", id: `key:${id}` } : { error: "Unknown API key. Create one at /developers, or use the demo key anc_demo." };
}

/** Fixed-window rate limiter, in memory per server (the daily allowance in budget.ts caps cost). */
const windows = new Map<string, { start: number; count: number }>();
export function rateLimit(id: string, limit: number, windowMs = 60_000): { ok: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const w = windows.get(id);
  if (!w || now - w.start >= windowMs) {
    windows.set(id, { start: now, count: 1 });
    return { ok: true, remaining: limit - 1, resetSeconds: Math.ceil(windowMs / 1000) };
  }
  w.count += 1;
  return { ok: w.count <= limit, remaining: Math.max(0, limit - w.count), resetSeconds: Math.ceil((w.start + windowMs - now) / 1000) };
}
