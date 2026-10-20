"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { X } from "lucide-react";
import { INFO, type InfoId } from "@/content/info";

/**
 * Info toggletip (shared/DESIGN_SYSTEM.md, section 6).
 * Opens on click, tap, Enter or Space; never on hover alone, so touch and
 * keyboard behave the same. Escape or clicking outside closes it, and focus
 * returns to the button. On phones it shows as a bottom sheet (globals.css).
 */
export function Info({ id, className = "" }: { id: InfoId; className?: string }) {
  const entry = INFO[id];
  const titleId = `info-${id}-title`;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`About: ${entry.title}`}
          className={`inline-grid h-11 w-11 shrink-0 place-items-center rounded-full align-middle text-muted hover:text-accent ${className}`}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.75" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="6.4" r="1.15" fill="currentColor" />
            <path d="M10 9.2v5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="dialog"
          aria-labelledby={titleId}
          side="bottom"
          align="center"
          sideOffset={4}
          collisionPadding={12}
          className="info-pop z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-[12px] border border-border bg-surface p-5 text-left text-[0.9375rem] leading-relaxed text-text shadow-card"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p id={titleId} className="text-base font-semibold">
              {entry.title}
            </p>
            <Popover.Close
              aria-label="Close"
              className="-mr-3 -mt-3 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-text"
            >
              <X aria-hidden="true" size={18} />
            </Popover.Close>
          </div>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">What it is</dt>
              <dd>{entry.what}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Why it matters</dt>
              <dd>{entry.why}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Where it comes from</dt>
              <dd>{entry.source}</dd>
            </div>
            {"technical" in entry && entry.technical ? (
              <div className="layer-technical">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Technical detail</dt>
                <dd className="font-mono text-[0.8125rem] break-words">{entry.technical}</dd>
              </div>
            ) : null}
          </dl>
          {"learnMoreHref" in entry && entry.learnMoreHref ? (
            <Link
              href={entry.learnMoreHref}
              className="mt-3 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4"
            >
              Learn more
            </Link>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
