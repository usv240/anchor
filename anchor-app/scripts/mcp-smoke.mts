/** Smoke test: start the Anchor MCP server as a real MCP client would, list tools, call each one. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", "scripts/mcp.mts"],
  env: { ...process.env, ANCHOR_URL: process.env.ANCHOR_URL ?? "http://localhost:3100" } as Record<string, string>,
});
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(transport);
const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));
const need = await client.callTool({ name: "anchor_need_map", arguments: { top: 3 } });
console.log("need_map:", JSON.stringify(need.content).slice(0, 260));
const plan = await client.callTool({ name: "anchor_plan_outreach", arguments: { gender: "female", age_groups: ["55_plus"], max_places: 5, zones: 5 } });
console.log("plan:", (plan.content as { text: string }[])[0].text.split("\n").slice(0, 8).join("\n"));
const text = (r: unknown) => ((r as { content: { text: string }[] }).content[0]?.text ?? "");
const qid = /Qloo id: ([0-9A-F-]{36})/i.exec(text(plan))?.[1];
if (qid) console.log("place_fans:", text(await client.callTool({ name: "anchor_place_fans", arguments: { place_id: qid } })));
else console.log("place_fans: skipped (no Qloo place in this plan; is QLOO_API_KEY set on the server?)");
console.log("reading_corner:", text(await client.callTool({ name: "anchor_reading_corner", arguments: { interests: ["Minecraft", "Pokemon", "Spider-Man"] } })).split("\n").slice(0, 8).join("\n"));
await client.close();
