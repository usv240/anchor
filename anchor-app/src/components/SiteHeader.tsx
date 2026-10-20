"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Anchor, Menu, X } from "lucide-react";
import { LayerSwitch, ThemeSwitch } from "@/components/PrefSwitches";
import { Info } from "@/components/Info";

export const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/proof", label: "Proof" },
  { href: "/research", label: "Research" },
  { href: "/developers", label: "Developers" },
  { href: "/judges", label: "Judges" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const menuId = useId();

  // Close the phone menu after navigating (adjusting state during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight">
          <Anchor aria-hidden="true" className="text-accent" size={24} strokeWidth={2} />
          <span>Anchor</span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-[8px] px-3 text-[0.9375rem] text-muted hover:text-text aria-[current=page]:text-text aria-[current=page]:font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <div className="flex items-center">
            <LayerSwitch />
            <Info id="simple-technical" />
          </div>
          <ThemeSwitch />
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4 font-medium text-accent-contrast hover:opacity-90"
          >
            Try it
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto grid h-11 w-11 place-items-center rounded-[10px] border border-border md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </div>

      <div id={menuId} hidden={!open} className="border-t border-border bg-bg md:hidden">
        <nav aria-label="Main" className="mx-auto max-w-[1200px] px-4 py-3">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="flex min-h-12 items-center text-base aria-[current=page]:font-semibold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <div className="flex items-center">
              <LayerSwitch />
              <Info id="simple-technical" />
            </div>
            <ThemeSwitch />
          </div>
          <Link
            href="/app"
            className="mt-3 flex min-h-12 items-center justify-center rounded-[10px] bg-accent font-medium text-accent-contrast"
          >
            Try it
          </Link>
        </nav>
      </div>
    </header>
  );
}
