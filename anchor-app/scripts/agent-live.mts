/** One real plan through the Claude agent (and Qloo), printed for checking by eye. Keys from .env.local. */
import { readFileSync } from "node:fs";
import { runClaudeAgent, makeAnthropicClient } from "../src/lib/agent/claude";
import { makeTrustProvider } from "../src/lib/domain/trust";
import { PlanRequest } from "../src/lib/domain/types";
import { TraceLedger } from "../src/lib/trace/ledger";
import { FileCache } from "../src/lib/qloo/fileCache";

const env = readFileSync(".env.local", "utf8");
const get = (k: string) => new RegExp(`^${k}=(.*)$`, "m").exec(env)?.[1]?.trim() ?? "";
const ledger = new TraceLedger();
const trust = makeTrustProvider({ qlooKey: get("QLOO_API_KEY"), ledger, cache: new FileCache() });
const prompt = process.argv[2] ?? "Saturday checks for older women, please skip fast food places";
const t0 = Date.now();
const { plan } = await runClaudeAgent(PlanRequest.parse({ audience: { ageGroups: ["55_plus"], gender: "female" }, prompt }), {
  trust,
  ledger,
  client: makeAnthropicClient(get("ANTHROPIC_API_KEY")),
  emit: (e) => e.type === "step" && e.status !== "running" && console.log(`  [${e.status}] ${e.label}: ${e.detail ?? ""}`),
});
console.log(`\n(${Math.round((Date.now() - t0) / 1000)} s) planner=${plan.mode.planner}  reframed=${plan.policy.reframed}`);
console.log("SUMMARY:", plan.summary);
for (const v of plan.venues) console.log(`${String(v.rank).padStart(2)} ${v.group.padEnd(9)} ${v.category.slice(0, 24).padEnd(24)} ${v.name.slice(0, 34)}`);
console.log("days:", [...new Set(plan.visits.map((v) => v.day))].join(", "));
