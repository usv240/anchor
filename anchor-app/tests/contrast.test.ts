import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Checks the colour tokens in globals.css against our published targets
 * (shared/DESIGN_SYSTEM.md, section 7.1), in both themes:
 *   body text 7:1 (WCAG AAA), muted text and accents 4.5:1 (WCAG AA),
 *   focus ring and borders used as UI boundaries 3:1 where required.
 */

const css = readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const tokens: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  light: block('[data-theme="light"]'),
  dark: block('[data-theme="dark"]'),
};

const PAIRS: { fg: string; bg: string; min: number; why: string }[] = [
  { fg: "text", bg: "bg", min: 7, why: "body text" },
  { fg: "text", bg: "surface", min: 7, why: "body text on cards" },
  { fg: "text", bg: "panel", min: 7, why: "body text on filled panels" },
  { fg: "text-muted", bg: "panel", min: 4.5, why: "secondary text on filled panels" },
  { fg: "accent", bg: "panel", min: 4.5, why: "accent and links on filled panels" },
  { fg: "text", bg: "surface-2", min: 7, why: "body text on raised surfaces" },
  { fg: "text-muted", bg: "bg", min: 4.5, why: "secondary text" },
  { fg: "text-muted", bg: "surface", min: 4.5, why: "secondary text on cards" },
  { fg: "accent", bg: "bg", min: 4.5, why: "accent links and labels" },
  { fg: "accent", bg: "surface", min: 4.5, why: "accent on cards" },
  { fg: "accent-contrast", bg: "accent", min: 4.5, why: "primary button label" },
  { fg: "accent", bg: "accent-soft", min: 4.5, why: "accent number on soft panel" },
  { fg: "focus", bg: "bg", min: 3, why: "focus ring (WCAG 2.4.13 / 1.4.11)" },
  { fg: "success", bg: "surface", min: 4.5, why: "status text" },
  { fg: "warning", bg: "surface", min: 4.5, why: "status text" },
  { fg: "danger", bg: "surface", min: 4.5, why: "status text" },
];

describe.each(Object.entries(themes))("%s theme contrast", (_name, t) => {
  it.each(PAIRS)("$fg on $bg is at least $min:1 ($why)", ({ fg, bg, min }) => {
    expect(t[fg], `missing token --${fg}`).toBeDefined();
    expect(t[bg], `missing token --${bg}`).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("system dark block matches the explicit dark theme", () => {
  it("uses identical token values", () => {
    const media = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    const systemDark = (() => {
      const open = media.indexOf("{", media.indexOf(":root:not"));
      const close = media.indexOf("}", open);
      const tokens: Record<string, string> = {};
      for (const m of media.slice(open + 1, close).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
        tokens[m[1]] = m[2];
      }
      return tokens;
    })();
    expect(systemDark).toEqual(themes.dark);
  });
});
