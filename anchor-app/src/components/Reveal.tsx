"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Entrance motion for [data-reveal] elements: each rises 18px and fades in once,
 * as it enters the screen (globals.css). Content is visible by default; this
 * component switches the effect on only after it has started observing, so a
 * failed script never hides anything. Skipped entirely for reduced motion.
 */
export function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")];
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    // Anything already on screen shows at once (no flash), the rest waits for scroll.
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) el.classList.add("is-in");
      else io.observe(el);
    }
    document.documentElement.dataset.reveal = "on";
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
