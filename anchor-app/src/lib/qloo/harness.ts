import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * The official Qloo harness (`@qloo/qloo-harness`, from the hackathon kit) as a
 * second, independent route to Qloo. Anchor's own REST client is the primary
 * path; the harness MCP server is used:
 *   - as a backup when a direct Qloo call fails (for example the audience profile),
 *   - to cross-check that Anchor's client and Qloo's official tools agree
 *     (scripts/qloo-crosscheck.mts).
 *
 * The harness runs as a local stdio process, so it works on a server or a
 * laptop but not in serverless functions (stated in the kit). When it cannot
 * start, callers carry on with the primary path and say so.
 *
 * The hackathon server is approved explicitly (QLOO_TRUSTED_BASE_URL), as the
 * harness requires for any non-production endpoint.
 */

export const HACKATHON_BASE_URL = "https://hackathon.api.qloo.com";

export type HarnessResult = { status: string; summary?: string; results?: unknown[]; error?: { code: string; retryable: boolean; recovery?: string } };

let shared: Promise<Client> | null = null;

function start(apiKey: string): Promise<Client> {
  const bin = path.join(process.cwd(), "node_modules", "@qloo", "qloo-harness", "dist", "bin.js");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [bin, "mcp"],
    env: {
      ...(process.env as Record<string, string>),
      QLOO_API_KEY: apiKey,
      QLOO_BASE_URL: HACKATHON_BASE_URL,
      QLOO_TRUSTED_BASE_URL: HACKATHON_BASE_URL,
    },
    stderr: "pipe",
  });
  const client = new Client({ name: "anchor", version: "1.0.0" });
  return client.connect(transport).then(() => client);
}

/** Calls one harness tool. Reuses one harness process per server. */
export async function harnessCall(apiKey: string, tool: string, args: Record<string, unknown>, timeoutMs = 20_000): Promise<HarnessResult> {
  shared ??= start(apiKey).catch((e) => {
    shared = null;
    throw e;
  });
  const client = await shared;
  const r = await Promise.race([
    client.callTool({ name: tool, arguments: args }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Qloo harness timed out")), timeoutMs)),
  ]);
  const structured = (r as { structuredContent?: HarnessResult }).structuredContent;
  if (structured) return structured;
  const text = ((r as { content?: { type: string; text?: string }[] }).content ?? []).find((c) => c.type === "text")?.text ?? "{}";
  return JSON.parse(text) as HarnessResult;
}

export async function closeHarness(): Promise<void> {
  if (!shared) return;
  const c = await shared.catch(() => null);
  shared = null;
  await c?.close();
}
