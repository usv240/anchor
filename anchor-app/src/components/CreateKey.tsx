"use client";

import { useState } from "react";
import { Copy, KeyRound } from "lucide-react";

/** Creates an API key. The key is shown once and never stored in the browser. */
export function CreateKey() {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/v1/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "The key could not be created.");
      setKey(j.key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[12px] bg-panel p-5">
      {key ? (
        <div>
          <p className="font-semibold">Your key</p>
          <p className="mt-1 text-sm text-muted">Save it now. For your security it will not be shown again.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-[8px] bg-bg px-3 py-2 font-mono text-sm">{key}</code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(key);
                setCopied(true);
              }}
              className="press inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-bg px-3 text-sm font-medium hover:bg-surface-2"
            >
              <Copy aria-hidden="true" size={16} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">{copied ? "Key copied" : ""}</p>
          <p className="mt-4 text-sm font-semibold">Try it now: make a plan from your own terminal</p>
          <pre className="mt-2 overflow-x-auto rounded-[8px] bg-bg p-3 text-[0.8125rem] leading-relaxed"><code className="font-mono">{curl(key)}</code></pre>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(curl(key))}
            className="press mt-2 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-bg px-3 text-sm font-medium hover:bg-surface-2"
          >
            <Copy aria-hidden="true" size={16} /> Copy example
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <label className="flex-1">
            <span className="text-sm font-semibold">Name for your key (optional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 60))}
              placeholder="For example: county outreach dashboard"
              className="mt-1.5 h-11 w-full rounded-[10px] border border-border bg-surface px-3"
            />
          </label>
          <button type="submit" disabled={busy} className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 font-semibold text-accent-contrast disabled:opacity-60">
            <KeyRound aria-hidden="true" size={18} /> Create API key
          </button>
        </form>
      )}
      {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function curl(key: string): string {
  const host = typeof window === "undefined" ? "https://YOUR-ANCHOR-HOST" : window.location.origin;
  return `curl -X POST "${host}/api/v1/plans?stream=false" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"audience":{"ageGroups":["55_plus"],"gender":"female"},"area":{"countyFips":"06037"}}'`;
}
