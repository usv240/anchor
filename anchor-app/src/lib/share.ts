import type { Plan } from "@/lib/domain/types";

/**
 * Link to a plan: its id, plus its settings so the app can make the plan again
 * if the server that made it has forgotten it (on serverless hosting each
 * request may reach a different machine). Partner lists are never put in a link.
 */
export function shareUrl(plan: Plan, origin: string): string {
  const { partners: _partners, ...settings } = plan.request;
  void _partners;
  const r = btoa(unescape(encodeURIComponent(JSON.stringify(settings)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${origin}/app?plan=${plan.planId}&r=${r}`;
}
