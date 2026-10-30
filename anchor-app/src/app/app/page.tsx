import type { Metadata } from "next";
import { AppClient } from "@/components/app/AppClient";
import { configured } from "@/lib/api/run";

export const metadata: Metadata = {
  title: "Plan outreach",
  description: "Find high-need neighbourhoods and trusted local places for blood pressure outreach, and download the plan.",
};

export default function AppPage() {
  const keys = configured();
  return <AppClient modes={{ trust: keys.qloo ? "qloo" : "offline", planner: keys.anthropic ? "claude" : "basic" }} />;
}
