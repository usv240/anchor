import { canonical, sha256, type TraceLedger } from "@/lib/trace/ledger";
import { guardInsightParams, type InsightParams } from "@/lib/qloo/params";

/**
 * Typed Qloo client (shared/PLATFORM.md, section 4).
 * - Hackathon base URL, X-Api-Key header, GET with query strings only.
 * - Parameter guard before every Insights call.
 * - Per-plan call budget, bounded retries, explicit errors (no silent fallback).
 * - Private cache keyed by the normalised request; BYOK requests use their own
 *   cache namespace so one caller's quota never serves another.
 * - Every call is written to the trace ledger (key removed, body hashed).
 */

export const QLOO_BASE_URL = "https://hackathon.api.qloo.com";

export class QlooError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "QlooError";
  }
}

export class QlooBudgetError extends QlooError {
  constructor(limit: number) {
    super(`call budget of ${limit} Qloo requests reached for this plan`);
    this.name = "QlooBudgetError";
  }
}

export interface QlooCache {
  get(key: string): Promise<string | undefined>;
  set(key: string, body: string): Promise<void>;
}

/** In-process cache for development and tests. Production uses Redis (same interface). */
export class MemoryCache implements QlooCache {
  private store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key);
  }
  async set(key: string, body: string) {
    this.store.set(key, body);
  }
}

export type QlooClientOptions = {
  apiKey: string;
  /** True when the key came from the caller (BYOK). Changes the cache namespace. */
  byok?: boolean;
  cache?: QlooCache;
  ledger?: TraceLedger;
  budget?: number;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  maxRetries?: number;
  /** Minimum gap between Qloo requests in ms (default 250). Tests pass 0. */
  minIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type QlooResult<T> = { data: T; traceId?: string; cached: boolean };

export class QlooClient {
  private calls = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly cache: QlooCache;
  private readonly namespace: string;

  constructor(private readonly opts: QlooClientOptions) {
    if (!opts.apiKey) throw new QlooError("Qloo API key is missing");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.cache = opts.cache ?? new MemoryCache();
    this.namespace = opts.byok ? `byok:${sha256(opts.apiKey).slice(7, 19)}` : "hosted";
  }

  get callsMade(): number {
    return this.calls;
  }

  /** GET /v2/insights after the parameter guard. */
  async insights<T = unknown>(params: InsightParams, summarize?: (data: T) => string): Promise<QlooResult<T>> {
    guardInsightParams(params);
    return this.get<T>("/v2/insights", params, "qloo.insights", summarize);
  }

  /** GET /search: resolve names to entity IDs. */
  search<T = unknown>(query: string, types?: string, take?: number): Promise<QlooResult<T>> {
    return this.get<T>("/search", { query, ...(types ? { types } : {}), ...(take ? { take } : {}) }, "qloo.search");
  }

  /** GET /v2/tags: find real tag IDs (there is no static tag list). */
  tags<T = unknown>(query: string, extra: InsightParams = {}): Promise<QlooResult<T>> {
    return this.get<T>("/v2/tags", { "filter.query": query, ...extra }, "qloo.tags");
  }

  /** GET /v2/audiences. Community audiences are refused by policy. */
  async audiences<T = unknown>(parentTypes: string): Promise<QlooResult<T>> {
    if (parentTypes.includes("urn:audience:communities")) {
      throw new QlooError("community audiences are disabled by Anchor's targeting policy");
    }
    return this.get<T>("/v2/audiences", { "filter.parents.types": parentTypes }, "qloo.audiences");
  }

  private async get<T>(
    path: string,
    params: InsightParams,
    tool: string,
    summarize?: (data: T) => string,
  ): Promise<QlooResult<T>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    const cacheKey = `qloo:${this.namespace}:${sha256(path + "?" + query)}`;

    const hit = await this.cache.get(cacheKey);
    if (hit !== undefined) {
      const data = JSON.parse(hit) as T;
      return { data, cached: true, traceId: this.trace(tool, path, params, hit, data, summarize, true) };
    }

    const budget = this.opts.budget ?? 60;
    if (this.calls >= budget) throw new QlooBudgetError(budget);
    this.calls += 1;

    const url = `${this.opts.baseUrl ?? QLOO_BASE_URL}${path}?${query}`;
    const maxRetries = this.opts.maxRetries ?? 3;
    const sleep = this.opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        await throttle(this.opts.minIntervalMs ?? QLOO_MIN_INTERVAL_MS, sleep);
        res = await this.fetchImpl(url, {
          method: "GET",
          headers: { "X-Api-Key": this.opts.apiKey, Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        if (attempt < maxRetries) {
          await sleep(backoff(attempt));
          continue;
        }
        throw new QlooError(`Qloo did not answer (${(err as Error).name})`);
      }

      if (res.ok) {
        const body = await res.text();
        const data = JSON.parse(body) as T;
        await this.cache.set(cacheKey, body);
        return { data, cached: false, traceId: this.trace(tool, path, params, body, data, summarize, false) };
      }

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < maxRetries) {
        const after = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : backoff(attempt));
        continue;
      }
      throw new QlooError(describeStatus(res.status), res.status);
    }
  }

  private trace<T>(
    tool: string,
    path: string,
    params: InsightParams,
    body: string,
    data: T,
    summarize: ((data: T) => string) | undefined,
    cached: boolean,
  ): string | undefined {
    if (!this.opts.ledger) return undefined;
    return this.opts.ledger.append({
      tool,
      request: { path, ...params, cached },
      responseBody: body,
      summary: summarize ? summarize(data) : `${path} ok`,
    }).id;
  }
}

/**
 * Qloo's hackathon limit is 5 requests per second and 10,000 per month
 * (x-second-ratelimit-limit and x-month-ratelimit-limit headers, seen Oct 19).
 * One shared slot per server process keeps us at 4 per second at most.
 */
export const QLOO_MIN_INTERVAL_MS = 250;
let nextSlot = 0;
async function throttle(minIntervalMs: number, sleep: (ms: number) => Promise<void>): Promise<void> {
  if (minIntervalMs <= 0) return;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + minIntervalMs;
  if (wait > 0) await sleep(wait);
}

function backoff(attempt: number): number {
  const base = 400 * 2 ** attempt;
  return base + Math.floor(Math.random() * base * 0.25);
}

function describeStatus(status: number): string {
  if (status === 401 || status === 403) {
    return `Qloo refused the key (${status}). Hackathon keys only work on hackathon.api.qloo.com, and some filter.type values are not enabled.`;
  }
  if (status === 429) return "Qloo rate limit reached. Try again shortly.";
  if (status === 400) return "Qloo rejected the request parameters (400).";
  return `Qloo returned an error (${status}).`;
}

/** Exposed for tests and the eval harness: stable cache keys. */
export const requestKey = (path: string, params: InsightParams) => sha256(path + canonical(params));
