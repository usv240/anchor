"use client";

import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { X } from "lucide-react";
import { INFO, type InfoId } from "@/content/info";

/** When the last info popover closed. Moving between info buttons opens the next one at once (no second delay). */
let lastClosed = 0;
let openNow = 0;
const HOVER_DELAY = 250;
const LEAVE_GRACE = 160;

/**
 * Info toggletip (shared/DESIGN_SYSTEM.md, section 6).
 * - Mouse: opens on hover after a short delay, instantly when moving from one
 *   info button to the next; closes when the pointer leaves. Clicking pins it open.
 * - Touch, pen and keyboard: opens on tap, Enter or Space (hover never fires there),
 *   and moves focus inside. Escape or clicking outside closes it.
 * On phones it shows as a bottom sheet (globals.css).
 */
export function Info({ id, className = "" }: { id: InfoId; className?: string }) {
  const entry = INFO[id];
  const titleId = `info-${id}-title`;
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const returnFocus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const finePointer = (e: React.PointerEvent) => e.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches;

  const change = (next: boolean) => {
    setOpen(next);
    if (!next) {
      returnFocus.current = pinned.current;
      pinned.current = false;
      lastClosed = Date.now();
    }
  };
  useEffect(() => {
    if (!open) return;
    openNow += 1;
    return () => {
      openNow -= 1;
      lastClosed = Date.now();
    };
  }, [open]);

  const hoverOpen = (e: React.PointerEvent) => {
    if (!finePointer(e) || open) return clear();
    clear();
    const delay = openNow > 0 || Date.now() - lastClosed < 600 ? 0 : HOVER_DELAY;
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (!finePointer(e) || pinned.current) return;
    clear();
    timer.current = setTimeout(() => change(false), LEAVE_GRACE);
  };

  return (
    <Popover.Root open={open} onOpenChange={change}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`About: ${entry.title}`}
          onPointerEnter={hoverOpen}
          onPointerLeave={hoverClose}
          onClick={(e) => {
            // Opened by hover, then clicked: keep it open (pin) instead of toggling it shut.
            if (open && !pinned.current) {
              e.preventDefault();
              pinned.current = true;
              return;
            }
            pinned.current = !open;
          }}
          className={`press inline-grid h-11 w-11 shrink-0 place-items-center rounded-full align-middle text-muted hover:text-accent data-[state=open]:text-accent ${className}`}
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
          onPointerEnter={clear}
          onPointerLeave={hoverClose}
          // A hover preview must not steal focus; a click or tap moves focus inside as usual.
          onOpenAutoFocus={(e) => {
            if (!pinned.current) e.preventDefault();
          }}
          // Closing a hover preview leaves focus where it was; a pinned one returns focus to its button.
          onCloseAutoFocus={(e) => {
            if (!returnFocus.current) e.preventDefault();
          }}
          className="info-pop z-50 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-[12px] bg-surface p-5 text-left text-[0.9375rem] leading-relaxed text-text shadow-[0_12px_32px_rgb(0_0_0/0.28)] ring-1 ring-border"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p id={titleId} className="text-base font-semibold">
              {entry.title}
            </p>
            <Popover.Close
              aria-label="Close"
              className="press -mr-3 -mt-3 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-text"
            >
              <X aria-hidden="true" size={18} />
            </Popover.Close>
          </div>
          <dl className="space-y-2.5">
            <div>
              <dt className="text-sm font-semibold text-muted">What it is</dt>
              <dd>{entry.what}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Why it matters</dt>
              <dd>{entry.why}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Where it comes from</dt>
              <dd>{entry.source}</dd>
            </div>
            {"technical" in entry && entry.technical ? (
              <div className="layer-technical">
                <dt className="text-sm font-semibold text-muted">Technical detail</dt>
                <dd>
                  <code className="font-mono text-[0.8125rem] break-words">{entry.technical}</code>
                </dd>
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
