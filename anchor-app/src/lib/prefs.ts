/**
 * User preferences: theme (light by default, dark, or match the device) and explanation layer
 * (simple, technical). Stored in localStorage and mirrored as attributes on
 * <html> so CSS can react before React hydrates (no flash).
 */

export const THEME_KEY = "anchor-theme";
export const LAYER_KEY = "anchor-layer";

export type Theme = "system" | "light" | "dark";
export type Layer = "simple" | "technical";

/**
 * Runs synchronously in <head> before first paint. Kept tiny and defensive:
 * localStorage can throw in some privacy modes.
 */
export const PREFS_INLINE_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){d.setAttribute("data-theme",t)}else if(t==="system"){d.removeAttribute("data-theme")}var l=localStorage.getItem("${LAYER_KEY}");d.setAttribute("data-layer",l==="technical"?"technical":"simple")}catch(e){}})();`;

const listeners = new Set<() => void>();

export function subscribePrefs(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function readTheme(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "system";
}

export function readLayer(): Layer {
  return document.documentElement.getAttribute("data-layer") === "technical" ? "technical" : "simple";
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Preference still applies for this page view.
  }
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  notify();
}

export function setLayer(layer: Layer): void {
  try {
    localStorage.setItem(LAYER_KEY, layer);
  } catch {
    // Preference still applies for this page view.
  }
  document.documentElement.setAttribute("data-layer", layer);
  notify();
}
