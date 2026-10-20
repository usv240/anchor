"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import { Copy } from "lucide-react";

/** Code samples in several languages, each with a copy button. */
export function CodeTabs({ samples }: { samples: { lang: string; code: string }[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <Tabs.Root defaultValue={samples[0].lang} className="overflow-hidden rounded-[12px] border border-border">
      <Tabs.List aria-label="Language" className="flex border-b border-border bg-surface-2">
        {samples.map((s) => (
          <Tabs.Trigger
            key={s.lang}
            value={s.lang}
            className="min-h-11 px-4 text-sm text-muted data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-text"
          >
            {s.lang}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {samples.map((s) => (
        <Tabs.Content key={s.lang} value={s.lang} className="relative bg-surface">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(s.code);
              setCopied(s.lang);
              setTimeout(() => setCopied(null), 2000);
            }}
            className="absolute right-2 top-2 inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-2"
          >
            <Copy aria-hidden="true" size={14} /> {copied === s.lang ? "Copied" : "Copy"}
          </button>
          <pre className="overflow-x-auto p-4 pr-24 font-mono text-[0.8125rem] leading-relaxed">{s.code}</pre>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
