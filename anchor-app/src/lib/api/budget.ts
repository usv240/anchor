/**
 * Daily spending guard for the hosted keys (not for bring-your-own keys).
 * The hackathon Qloo key allows 10,000 calls a month, and the Anthropic key is
 * paid per use, so a public demo needs a ceiling. When a day's allowance is
 * used up, plans still work: they switch to the cached or basic path and say
 * so. Counters are per server instance (no shared store), which errs on the
 * side of more capacity, not less; the Anthropic console limit is the hard cap.
 *
 * Env: ANCHOR_DAILY_QLOO_PLANS (default 300), ANCHOR_DAILY_CLAUDE_PLANS (default 150).
 */

type Kind = "qloo" | "claude";
const DEFAULTS: Record<Kind, number> = { qloo: 300, claude: 150 };
const ENV: Record<Kind, string> = { qloo: "ANCHOR_DAILY_QLOO_PLANS", claude: "ANCHOR_DAILY_CLAUDE_PLANS" };

let day = "";
const used: Record<Kind, number> = { qloo: 0, claude: 0 };

function limit(kind: Kind): number {
  const v = Number(process.env[ENV[kind]]);
  return Number.isFinite(v) && v >= 0 ? v : DEFAULTS[kind];
}

function roll(now: Date) {
  const today = now.toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    used.qloo = 0;
    used.claude = 0;
  }
}

/** Takes one plan's worth of allowance. False means today's allowance is used up. */
export function take(kind: Kind, now = new Date()): boolean {
  roll(now);
  if (used[kind] >= limit(kind)) return false;
  used[kind] += 1;
  return true;
}

export function remaining(kind: Kind, now = new Date()): number {
  roll(now);
  return Math.max(0, limit(kind) - used[kind]);
}

/** For tests. */
export function resetBudget() {
  day = "";
  used.qloo = 0;
  used.claude = 0;
}
