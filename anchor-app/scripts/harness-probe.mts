/** List the official Qloo harness MCP tools and their input schemas (no Qloo call needed for listing). */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "node:fs";
import path from "node:path";

const key = /^QLOO_API_KEY=(.*)$/m.exec(readFileSync(".env.local", "utf8"))?.[1]?.trim() ?? "";
const bin = path.join("node_modules", "@qloo", "qloo-harness", "dist", "bin.js");
const transport = new StdioClientTransport({ command: process.execPath, args: [bin, "mcp"], env: { ...process.env, QLOO_API_KEY: key } as Record<string, string>, stderr: "pipe" });
const client = new Client({ name: "anchor-probe", version: "1.0.0" });
await client.connect(transport);
const { tools } = await client.listTools();
for (const t of tools) console.log(`- ${t.name}: ${(t.description ?? "").slice(0, 110)}\n    input: ${JSON.stringify(t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : t.inputSchema).slice(0, 200)}`);
const cap = await client.callTool({ name: "qloo_capabilities", arguments: {} });
console.log("\ncapabilities:", JSON.stringify(cap.structuredContent ?? cap.content).slice(0, 600));
await client.close();
