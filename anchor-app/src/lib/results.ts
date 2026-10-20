import { readFile } from "node:fs/promises";
import path from "node:path";

/** The latest evaluation results (scripts/eval.ts). Public data only, safe to show. */

export type SystemResult = {
  label: string;
  needCapture?: number;
  meanNeedPercentile?: number;
  unsuitableRate?: number;
  licensedRate?: number;
  categories?: number;
  repeats?: number;
  pending?: string;
};

export type EvalResults = {
  runAt: string;
  requests: number;
  mode: { trust: string; planner: string };
  definitions: Record<string, string>;
  systems: Record<"anchor" | "anchorOffline" | "mapSearch" | "mapSearchAny" | "aiOnly" | "qlooNoNeed", SystemResult>;
  policy: {
    targeting: { passed: number; total: number };
    controls: { passed: number; total: number };
    alcohol: { passed: number; total: number };
    medical: { measured: boolean; passed?: number; total: number; note: string };
    rows: { id: string; kind: string; expect: string; pass: boolean | null; note?: string }[];
  };
  qloo: {
    audienceOverlap: { a: string; b: string; overlap: number }[];
    meanAudienceOverlap: number | null;
    lovedPlacesMatchedToLicence: number | null;
    smallSalonCoverage: string;
    aiAudienceOverlap: number | null;
    fanReach?: Record<"anchor" | "qlooNoNeed", { places: number; meanHighNeedShare: number } | null>;
    aiDistinctPlaces: string | null;
  } | null;
  notes: string[];
};

export async function loadResults(): Promise<EvalResults> {
  "use cache";
  return JSON.parse(await readFile(path.join(process.cwd(), "public", "data", "eval", "results.json"), "utf8")) as EvalResults;
}

export const pct = (n: number | undefined) => (n === undefined ? "Pending" : `${Math.round(n * 100)}%`);
export const dec = (n: number | undefined) => (n === undefined ? "Pending" : n.toFixed(2));
