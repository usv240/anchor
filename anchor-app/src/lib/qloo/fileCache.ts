import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { QlooCache } from "@/lib/qloo/client";

/**
 * Private, server-side cache of Qloo responses on disk. The hackathon guide
 * allows private server-side caching; responses must never be published, so
 * the directory is git-ignored (/data/qloo-cache/) and never served.
 *
 * Why: it saves the event quota (10,000 calls a month) and keeps the demo
 * working if Qloo is slow or down (winner pattern 8: the demo cannot break).
 * Entries expire after 7 days. On read-only hosts it falls back to /tmp.
 */
export class FileCache implements QlooCache {
  constructor(
    private readonly dir = process.env.ANCHOR_QLOO_CACHE_DIR ?? path.join(process.cwd(), "data", "qloo-cache", "http"),
    private readonly ttlMs = 7 * 24 * 60 * 60 * 1000,
  ) {}

  private file(key: string) {
    return path.join(this.dir, createHash("sha256").update(key).digest("hex").slice(0, 40) + ".json");
  }

  async get(key: string): Promise<string | undefined> {
    try {
      const f = this.file(key);
      const s = await stat(f);
      if (Date.now() - s.mtimeMs > this.ttlMs) return undefined;
      return await readFile(f, "utf8");
    } catch {
      return undefined;
    }
  }

  async set(key: string, body: string): Promise<void> {
    try {
      await mkdir(this.dir, { recursive: true });
      await writeFile(this.file(key), body);
    } catch {
      // Read-only filesystem: skip caching rather than fail the plan.
    }
  }
}

let shared: FileCache | null = null;
export function sharedQlooCache(): FileCache {
  shared ??= new FileCache();
  return shared;
}
