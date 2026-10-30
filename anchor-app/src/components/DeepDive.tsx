"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";

export type DeepDivePanel = { id: string; label: string; aliases?: string[]; content: ReactNode };

/**
 * The landing page's detail, one tab at a time, so the page stays short.
 * Each tab answers to its own link (#proof, #how) and to the old section links
 * (#study, #why-qloo), so every existing link still opens the right tab.
 * All panels are in the page for search engines and print; only the chosen one shows.
 */
export function DeepDive({ panels }: { panels: DeepDivePanel[] }) {
  const [tab, setTab] = useState(panels[0].id);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      const hit = panels.find((p) => p.id === h || p.aliases?.includes(h));
      if (!hit) return;
      setTab(hit.id);
      requestAnimationFrame(() => root.current?.scrollIntoView({ block: "start" }));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [panels]);

  return (
    <Tabs.Root
      ref={root}
      value={tab}
      onValueChange={(v) => {
        setTab(v);
        history.replaceState(null, "", `#${v}`);
      }}
      className="scroll-mt-20"
    >
      <Tabs.List aria-label="Details" className="flex flex-wrap gap-2 print:hidden">
        {panels.map((p) => (
          <Tabs.Trigger
            key={p.id}
            value={p.id}
            className="press min-h-11 rounded-full bg-panel px-4 text-sm font-medium text-muted hover:text-text data-[state=active]:bg-accent data-[state=active]:text-accent-contrast sm:text-base"
          >
            {p.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {panels.map((p) => (
        <Tabs.Content
          key={p.id}
          value={p.id}
          forceMount
          className="mt-6 focus-visible:outline-none data-[state=inactive]:hidden print:mt-10 print:data-[state=inactive]:block"
        >
          <h3 className="sr-only print:not-sr-only print:mb-4 print:text-xl print:font-semibold">{p.label}</h3>
          {p.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
