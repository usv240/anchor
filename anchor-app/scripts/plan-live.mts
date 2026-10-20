/** Run one real plan with the Qloo key from .env.local and print it (for checking quality by eye). */
import { readFileSync } from "node:fs";
import { runBasicPlanner } from "../src/lib/agent/basic";
import { makeTrustProvider } from "../src/lib/domain/trust";
import { PlanRequest } from "../src/lib/domain/types";
import { TraceLedger } from "../src/lib/trace/ledger";
import { FileCache } from "../src/lib/qloo/fileCache";

const key = /^QLOO_API_KEY=(.*)$/m.exec(readFileSync(".env.local", "utf8"))?.[1]?.trim();
const [age = "35_to_54", gender = "male"] = process.argv.slice(2);
const ledger = new TraceLedger();
const trust = makeTrustProvider({ qlooKey: key, ledger, cache: new FileCache() });
const { plan } = await runBasicPlanner(PlanRequest.parse({ audience: { ageGroups: [age], gender } }), { trust, ledger, emit: (e) => e.type === "step" && e.status !== "running" && console.log(`  [${e.status}] ${e.label}: ${e.detail ?? ""}`) });
console.log("\n" + plan.summary);
for (const v of plan.venues) console.log(`${String(v.rank).padStart(2)} ${v.group.padEnd(9)} ${v.category.slice(0, 22).padEnd(22)} ${v.name.slice(0, 30).padEnd(30)} ${v.scores.anchor.toFixed(2)} | ${v.why.slice(0, 170)}`);
console.log("\nremoved:", plan.removed.slice(0, 8).map((r) => `${r.name} (${r.reason})`).join("; "));
