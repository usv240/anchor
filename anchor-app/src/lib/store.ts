import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plan } from "@/lib/domain/types";
import type { TraceRecord } from "@/lib/trace/ledger";

/**
 * Plan storage. In memory, mirrored to disk (ANCHOR_DATA_DIR, default .data)
 * so plans survive a dev-server restart. On read-only hosts the disk write
 * fails quietly and plans live in memory. Plans hold no personal data.
 * Production swaps this for Redis behind the same functions.
 */

type Stored = { plan: Plan; trace: TraceRecord[] };

const memory = new Map<string, Stored>();
const dir = () => path.join(process.env.ANCHOR_DATA_DIR ?? path.join(process.cwd(), ".data"), "plans");
const safeId = (id: string) => /^pln_[a-z0-9]{16}$/.test(id);

export async function savePlan(plan: Plan, trace: TraceRecord[]): Promise<void> {
  memory.set(plan.planId, { plan, trace });
  try {
    await mkdir(dir(), { recursive: true });
    await writeFile(path.join(dir(), `${plan.planId}.json`), JSON.stringify({ plan, trace }));
  } catch {
    // Read-only filesystem: memory only.
  }
}

export async function getPlan(id: string): Promise<Stored | undefined> {
  if (!safeId(id)) return undefined;
  const hit = memory.get(id);
  if (hit) return hit;
  try {
    const stored = JSON.parse(await readFile(path.join(dir(), `${id}.json`), "utf8")) as Stored;
    memory.set(id, stored);
    return stored;
  } catch {
    return undefined;
  }
}
