/** Real calls through the official Qloo harness MCP, pointed at the hackathon server. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const key = /^QLOO_API_KEY=(.*)$/m.exec(readFileSync(".env.local", "utf8"))?.[1]?.trim() ?? "";
const bin = path.join("node_modules", "@qloo", "qloo-harness", "dist", "bin.js");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [bin, "mcp"],
  env: { ...process.env, QLOO_API_KEY: key, QLOO_BASE_URL: "https://hackathon.api.qloo.com", QLOO_TRUSTED_BASE_URL: "https://hackathon.api.qloo.com" } as Record<string, string>,
  stderr: "pipe",
});
const client = new Client({ name: "anchor-probe", version: "1.0.0" });
await client.connect(transport);

const call = async (name: string, args: Record<string, unknown>) => {
  const r = await client.callTool({ name, arguments: args });
  const s = (r.structuredContent ?? JSON.parse((r.content as { text: string }[])[0].text)) as Record<string, unknown>;
  writeFileSync(`data/qloo-cache/harness-${name}.json`, JSON.stringify(s));
  console.log(`\n${name}:`, s.status, "|", String(s.summary ?? "").slice(0, 220));
  console.log("  results:", JSON.stringify(s.results ?? "").slice(0, 600));
  return s;
};

await call("qloo_audience_demographics", { entity: "73964988-707A-48EF-95BE-F0835083C7DF", entity_type: "place" });
await call("qloo_rank", {
  options: ["73964988-707A-48EF-95BE-F0835083C7DF", "9018361E-5067-4DBE-A222-36F6AD76C913"],
  option_type: "place",
  demographic: "women 55 and older",
});
await client.close();
