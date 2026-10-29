import type { Metadata } from "next";
import Link from "next/link";
import { CodeTabs } from "@/components/CodeTabs";
import { CreateKey } from "@/components/CreateKey";
import { Info } from "@/components/Info";

export const metadata: Metadata = { title: "Developers" };

const BODY = `{
  "audience": { "ageGroups": ["35_to_54"], "gender": "male" },
  "options": { "zones": 8, "maxVenues": 12, "preferredDays": ["saturday"] }
}`;

const QUICKSTART = [
  {
    lang: "curl",
    code: `curl -X POST "https://YOUR-ANCHOR-HOST/api/v1/plans?stream=false" \\
  -H "Authorization: Bearer anc_demo" \\
  -H "Content-Type: application/json" \\
  -d '${BODY.replace(/\n\s*/g, " ")}'`,
  },
  {
    lang: "JavaScript",
    code: `const res = await fetch("https://YOUR-ANCHOR-HOST/api/v1/plans?stream=false", {
  method: "POST",
  headers: { Authorization: "Bearer anc_demo", "Content-Type": "application/json" },
  body: JSON.stringify(${BODY.replace(/\n/g, "\n  ")}),
});
const plan = await res.json();
console.log(plan.summary);
for (const v of plan.venues) console.log(v.rank, v.name, v.scores.anchor);`,
  },
  {
    lang: "Python",
    code: `import requests

plan = requests.post(
    "https://YOUR-ANCHOR-HOST/api/v1/plans",
    params={"stream": "false"},
    headers={"Authorization": "Bearer anc_demo"},
    json={
        "audience": {"ageGroups": ["35_to_54"], "gender": "male"},
        "options": {"zones": 8, "maxVenues": 12, "preferredDays": ["saturday"]},
    },
).json()

print(plan["summary"])
for v in plan["venues"]:
    print(v["rank"], v["name"], v["scores"]["anchor"])`,
  },
];

const STREAM = [
  {
    lang: "JavaScript",
    code: `// Default: a stream of newline-delimited JSON events, then the plan.
const res = await fetch("https://YOUR-ANCHOR-HOST/api/v1/plans", {
  method: "POST",
  headers: { Authorization: "Bearer anc_demo", "Content-Type": "application/json" },
  body: "{}",
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\\n");
  buffer = lines.pop();
  for (const line of lines.filter(Boolean)) {
    const event = JSON.parse(line);
    if (event.type === "step") console.log(event.status, event.label);
    if (event.type === "plan") console.log("Plan", event.plan.planId);
  }
}`,
  },
];

const MCP = [
  {
    lang: "Claude Desktop",
    code: `{
  "mcpServers": {
    "anchor": {
      "command": "npx",
      "args": ["tsx", "/path/to/anchor-app/scripts/mcp.mts"],
      "env": { "ANCHOR_URL": "https://YOUR-ANCHOR-HOST", "ANCHOR_API_KEY": "anc_demo" }
    }
  }
}`,
  },
  {
    lang: "Claude Code",
    code: `claude mcp add anchor \\
  --env ANCHOR_URL=https://YOUR-ANCHOR-HOST \\
  --env ANCHOR_API_KEY=anc_demo \\
  -- npx tsx /path/to/anchor-app/scripts/mcp.mts`,
  },
];

const ENDPOINTS: [string, string, string][] = [
  ["POST", "/api/v1/plans", "Create a plan. Streams step events, then the plan. Add ?stream=false for one JSON response."],
  ["GET", "/api/v1/plans/{id}", "Get a finished plan."],
  ["GET", "/api/v1/plans/{id}/export/{format}", "Download as csv, geojson, ics (calendar) or json."],
  ["GET", "/api/v1/plans/{id}/trace", "The recorded steps behind a plan."],
  ["GET", "/api/v1/plans/{id}/verify", "Check the evidence chain and every citation."],
  ["GET", "/api/v1/need", "High-need zones from CDC estimates."],
  ["GET", "/api/v1/places/{id}/audience", "Who loves a Qloo place, by age group and gender."],
  ["GET", "/api/v1/places/{id}/fans", "Where a Qloo place's fans are, and how many of its strongest fan areas are high need."],
  ["GET", "/api/v1/heatmap", "Where a group's tastes concentrate (Qloo heatmap)."],
  ["POST", "/api/v1/books", "Children's books for a reading corner, from kids' interests."],
  ["POST", "/api/v1/keys", "Create an API key (shown once)."],
  ["GET", "/api/v1/health", "Service status and which modes are on."],
  ["GET", "/api/v1/openapi.json", "OpenAPI 3.1 spec, generated from the same schemas the API validates with."],
];

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
      <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">Developers</h1>
      <p className="mt-4 text-lg text-muted">
        Use Anchor from your own software or AI assistant. <strong className="text-text">Not a developer?</strong> You only need the{" "}
        <Link href="/app" className="text-accent underline underline-offset-4">web app</Link>; you can skip this page.
      </p>

      <section className="mt-10" aria-labelledby="qs">
        <h2 id="qs" className="flex items-center text-2xl font-semibold">Try it in one minute <Info id="use-api" /></h2>
        <p className="mt-2 text-muted">
          The public demo key <code className="rounded bg-surface-2 px-1.5 font-mono">anc_demo</code> works right away (10 requests a minute). Replace YOUR-ANCHOR-HOST with this site&apos;s address.
        </p>
        <div className="mt-4">
          <CodeTabs samples={QUICKSTART} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="ep">
        <h2 id="ep" className="text-2xl font-semibold">Endpoints</h2>
        <div className="mt-4 overflow-x-auto rounded-[12px] bg-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="p-3">Method</th>
                <th scope="col" className="p-3">Path</th>
                <th scope="col" className="p-3">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {ENDPOINTS.map(([m, p, d]) => (
                <tr key={p + m}>
                  <td className="p-3 font-mono">{m}</td>
                  <td className="p-3 font-mono">{p}</td>
                  <td className="p-3">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Full schema: <a className="text-accent underline underline-offset-4" href="/api/v1/openapi.json">openapi.json</a>. Errors are JSON:{" "}
          <code className="font-mono">{`{ "error": { "status", "message" } }`}</code>. Limits come back in RateLimit headers.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="stream">
        <h2 id="stream" className="text-2xl font-semibold">Watch the agent work (streaming)</h2>
        <p className="mt-2 text-muted">By default, the plan endpoint streams each step as it happens, the same events the web app shows.</p>
        <div className="mt-4">
          <CodeTabs samples={STREAM} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="keys">
        <h2 id="keys" className="text-2xl font-semibold">Your own API key</h2>
        <p className="mt-2 text-muted">Free, no sign-up, 60 requests a minute. Only a hash of the key is stored.</p>
        <div className="mt-4">
          <CreateKey />
        </div>
      </section>

      <section id="mcp" className="mt-12 scroll-mt-24" aria-labelledby="mcp-t">
        <h2 id="mcp-t" className="flex items-center text-2xl font-semibold">Use Anchor from Claude and other AI assistants <Info id="use-mcp" /></h2>
        <p className="mt-2 text-muted">
          Anchor ships an MCP server, so an AI assistant can find need zones, make plans and download them as tools. Tools: <code className="font-mono">anchor_need_map</code>,{" "}
          <code className="font-mono">anchor_plan_outreach</code>, <code className="font-mono">anchor_get_plan</code>.
        </p>
        <div className="mt-4">
          <CodeTabs samples={MCP} />
        </div>
      </section>

      <section id="byok" className="mt-12 scroll-mt-24" aria-labelledby="byok-t">
        <h2 id="byok-t" className="flex items-center text-2xl font-semibold">Bring your own Qloo key <Info id="use-byok" /></h2>
        <p className="mt-2 text-muted">
          Send <code className="font-mono">X-Qloo-Key: your-key</code> with a plan request, or paste it under More options in the app. It is used for that request only, never stored or logged, and your usage
          counts against your own Qloo quota.
        </p>
      </section>

      <section id="byod" className="mt-12 scroll-mt-24" aria-labelledby="byod-t">
        <h2 id="byod-t" className="flex items-center text-2xl font-semibold">Bring your own data <Info id="use-byod" /></h2>
        <p className="mt-2 text-muted">
          Upload a CSV of partner places in the app (under More options), or send them as <code className="font-mono text-sm">partners</code> in{" "}
          <code className="font-mono text-sm">POST /api/v1/plans</code>: up to 200 objects with <code className="font-mono text-sm">name</code>, <code className="font-mono text-sm">lat</code>,{" "}
          <code className="font-mono text-sm">lon</code> and an optional <code className="font-mono text-sm">category</code>. The plan then includes <code className="font-mono text-sm">partnerCheck</code>: how
          many partners sit in high-need neighbourhoods, and each partner&apos;s need score. Places only: files with columns about people are refused, and partner lists are never put in share links.
        </p>
      </section>
    </div>
  );
}
