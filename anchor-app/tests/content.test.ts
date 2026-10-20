import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INFO } from "@/content/info";
import { GLOSSARY } from "@/content/glossary";
import { FAQ } from "@/content/landing";

/**
 * Content rules from shared/DESIGN_SYSTEM.md:
 *  - no emojis and no em or en dashes anywhere in UI source or content
 *  - every <Info id="..."> used in the UI exists in content/info.ts
 *  - simple explanations stay easy to read (Flesch reading ease)
 */

const SRC = path.join(__dirname, "..", "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(tsx?|css|mdx?)$/.test(name) ? [full] : [];
  });
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{1F000}-\u{1F2FF}]/u;
const DASHES = /[–—]/;

describe("style rules", () => {
  const all = files(SRC);
  it("finds source files", () => expect(all.length).toBeGreaterThan(5));
  it.each(all.map((f) => [path.relative(SRC, f), f]))("%s has no emojis or em/en dashes", (_rel, f) => {
    const text = readFileSync(f, "utf8");
    const lines = text.split("\n");
    const bad = lines
      .map((l, i) => ({ l, i: i + 1 }))
      .filter(({ l }) => EMOJI.test(l) || DASHES.test(l))
      .map(({ l, i }) => `${i}: ${l.trim().slice(0, 80)}`);
    expect(bad).toEqual([]);
  });
});

describe("info buttons", () => {
  const used = new Set<string>();
  for (const f of files(SRC)) {
    for (const m of readFileSync(f, "utf8").matchAll(/(?:<Info\s+id|\binfo):\s*"([a-z0-9-]+)"|<Info\s+id="([a-z0-9-]+)"/g)) {
      used.add(m[1] ?? m[2]);
    }
  }
  it("are used in the UI", () => expect(used.size).toBeGreaterThan(10));
  it.each([...used])("%s has an entry in content/info.ts", (id) => {
    expect(INFO).toHaveProperty(id);
  });
  it.each(Object.entries(INFO))("%s has what, why and where", (_id, entry) => {
    expect(entry.what.length).toBeGreaterThan(20);
    expect(entry.why.length).toBeGreaterThan(20);
    expect(entry.source.length).toBeGreaterThan(5);
  });
});

/** Flesch reading ease. 60+ is "plain English"; higher is easier. */
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function readingEase(text: string): number {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) ?? []).length);
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length);
}

describe("plain English", () => {
  const simpleText = [
    ...Object.values(INFO).flatMap((e) => [e.what, e.why]),
    ...GLOSSARY.map((t) => t.meaning),
    ...FAQ.map((f) => f.a),
  ].join(" ");

  it("simple explanations score 60+ on Flesch reading ease overall", () => {
    expect(readingEase(simpleText)).toBeGreaterThanOrEqual(60);
  });
});
