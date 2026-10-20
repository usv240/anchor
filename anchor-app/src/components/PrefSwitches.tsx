"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  readLayer,
  readTheme,
  setLayer,
  setTheme,
  subscribePrefs,
  type Layer,
  type Theme,
} from "@/lib/prefs";

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match my device", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeSwitch() {
  const theme = useSyncExternalStore<Theme>(subscribePrefs, readTheme, () => "system");
  return (
    <div role="group" aria-label="Colour theme" className="flex rounded-[10px] border border-border bg-surface p-0.5">
      {THEMES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className="grid h-11 w-11 place-items-center rounded-[8px] text-muted hover:text-text aria-pressed:bg-surface-2 aria-pressed:text-text"
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

const LAYERS: { value: Layer; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "technical", label: "Technical" },
];

export function LayerSwitch() {
  const layer = useSyncExternalStore<Layer>(subscribePrefs, readLayer, () => "simple");
  return (
    <div
      role="group"
      aria-label="Explanation level"
      className="flex rounded-[10px] border border-border bg-surface p-0.5 text-sm font-medium"
    >
      {LAYERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={layer === value}
          onClick={() => setLayer(value)}
          className="h-11 min-w-11 rounded-[8px] px-3 text-muted hover:text-text aria-pressed:bg-surface-2 aria-pressed:text-text"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
