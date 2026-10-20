import type { Metadata } from "next";
import { AppClient } from "@/components/app/AppClient";

export const metadata: Metadata = {
  title: "Plan outreach",
  description: "Find high-need neighbourhoods and trusted local places for blood pressure outreach, and download the plan.",
};

export default function AppPage() {
  return <AppClient />;
}
