import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * API keys (shared/PLATFORM.md section 7.1). A key is shown once; only its
 * SHA-256 hash is stored. The public demo key is documented and always works.
 */

export const DEMO_KEY = "anc_demo";
const file = () => path.join(process.env.ANCHOR_DATA_DIR ?? path.join(process.cwd(), ".data"), "keys.json");
const hash = (key: string) => createHash("sha256").update(key).digest("hex");

type KeyRecord = { hash: string; label: string; createdAt: string };
let keys: KeyRecord[] | null = null;

async function load(): Promise<KeyRecord[]> {
  if (keys) return keys;
  try {
    keys = JSON.parse(await readFile(file(), "utf8")) as KeyRecord[];
  } catch {
    keys = [];
  }
  return keys;
}

export async function createKey(label: string): Promise<{ key: string; label: string; createdAt: string }> {
  const key = `anc_live_${randomBytes(24).toString("base64url")}`;
  const record = { hash: hash(key), label: label.slice(0, 60) || "my key", createdAt: new Date().toISOString() };
  const all = await load();
  all.push(record);
  try {
    await mkdir(path.dirname(file()), { recursive: true });
    await writeFile(file(), JSON.stringify(all));
  } catch {
    // Read-only filesystem: key lives in memory for this server instance.
  }
  return { key, label: record.label, createdAt: record.createdAt };
}

export type Caller = { kind: "demo" | "key" | "web"; id: string };

/**
 * Who is calling. No Authorization header means the web app (or a quick local
 * test), rate-limited by IP. A Bearer key must be the demo key or a real key.
 */
export async function identify(req: Request): Promise<Caller | { error: string }> {
  const auth = req.headers.get("authorization");
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!auth) return { kind: "web", id: `ip:${ip}` };
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!m) return { error: "Use the header Authorization: Bearer <your key>." };
  if (m[1] === DEMO_KEY) return { kind: "demo", id: `demo:${ip}` };
  const h = hash(m[1]);
  const all = await load();
  return all.some((k) => k.hash === h) ? { kind: "key", id: `key:${h.slice(0, 12)}` } : { error: "Unknown API key." };
}

/** Fixed-window rate limiter, in memory (Redis in production). */
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
