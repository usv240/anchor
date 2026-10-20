import { createHash } from "node:crypto";

/**
 * Provenance ledger (shared/PLATFORM.md, section 6).
 * Every tool call becomes a record that includes the hash of the record before
 * it, so the evidence behind a plan cannot be edited without detection.
 * Response bodies are never stored here, only their SHA-256 hash and a short
 * summary, so Qloo data is never redistributed through a trace.
 */

export type TraceRecord = {
  id: string;
  ts: string;
  tool: string;
  request: Record<string, unknown>;
  responseSha256: string;
  summary: string;
  prevHash: string;
  hash: string;
};

const GENESIS = "sha256:genesis";

export const sha256 = (text: string) => "sha256:" + createHash("sha256").update(text).digest("hex");

/** Stable JSON: object keys sorted at every level, so hashes do not depend on key order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const SECRET_KEYS = /^(x-api-key|x-qloo-key|authorization|apikey|api_key)$/i;

/** Removes anything that looks like a credential before a request is recorded. */
export function redact(request: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(request).filter(([k]) => !SECRET_KEYS.test(k)));
}

function recordHash(r: Omit<TraceRecord, "hash">): string {
  return sha256(canonical(r));
}

export class TraceLedger {
  private records: TraceRecord[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  append(entry: { tool: string; request: Record<string, unknown>; responseBody: string; summary: string }): TraceRecord {
    const prevHash = this.records.at(-1)?.hash ?? GENESIS;
    const base = {
      id: `tr_${String(this.records.length + 1).padStart(4, "0")}`,
      ts: this.now().toISOString(),
      tool: entry.tool,
      request: redact(entry.request),
      responseSha256: sha256(entry.responseBody),
      summary: entry.summary,
      prevHash,
    };
    const record: TraceRecord = { ...base, hash: recordHash(base) };
    this.records.push(record);
    return record;
  }

  get head(): string {
    return this.records.at(-1)?.hash ?? GENESIS;
  }

  has(id: string): boolean {
    return this.records.some((r) => r.id === id);
  }

  toJSON(): TraceRecord[] {
    return this.records.map((r) => ({ ...r }));
  }
}

/** Recomputes the chain. Returns the first broken record, if any. */
export function verifyChain(records: TraceRecord[]): { valid: boolean; brokenAt?: string } {
  let prev = GENESIS;
  for (const r of records) {
    const { hash, ...rest } = r;
    if (r.prevHash !== prev || recordHash(rest) !== hash) return { valid: false, brokenAt: r.id };
    prev = hash;
  }
  return { valid: true };
}
