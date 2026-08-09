"use client";

// GSAP + ScrollTrigger, registered once.
//
// Framer Motion still owns component-level state transitions — it's
// declarative and it already drives the lifecycle timeline. GSAP is here
// for the thing Framer is bad at: long, scroll-linked timelines that
// coordinate several elements against the scrollbar position.
//
// Everything below is a no-op under `prefers-reduced-motion`, and the
// helpers all return a cleanup function for React effects.

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function useGsap() {
  // useLayoutEffect on the client, useEffect on the server — avoids the
  // SSR warning while still running before paint in the browser.
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }
  }, []);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs a GSAP setup function inside a scoped context, so every tween and
 * ScrollTrigger it creates is reverted together on unmount. Without the
 * context, triggers survive navigation and quietly pile up.
 */
export function useGsapContext(
  setup: (context: { scope: HTMLElement | null }) => void,
  scopeRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  useGsap();

  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const context = gsap.context(() => {
      setupRef.current({ scope: scopeRef.current });
    }, scopeRef.current ?? undefined);

    // A late web-font swap changes element heights, which invalidates every
    // scroll position GSAP measured. Recalculating once fonts settle avoids
    // sections firing at the wrong scroll offset.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => context.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * The workhorse: reveal children as they enter the viewport.
 *
 * Deliberately NOT applied to everything — docs/DESIGN_SYSTEM.md still
 * bans indiscriminate fade-up-on-scroll. This is opt-in per section, and
 * the stagger is what carries the feeling, not the distance travelled.
 */
export function revealOnScroll(
  targets: gsap.DOMTarget,
  options: {
    y?: number;
    stagger?: number;
    duration?: number;
    start?: string;
    trigger?: gsap.DOMTarget;
    scale?: number;
    rotate?: number;
  } = {},
) {
  const {
    y = 28,
    stagger = 0.08,
    duration = 0.7,
    start = "top 82%",
    trigger,
    scale,
    rotate,
  } = options;

  return gsap.from(targets, {
    y,
    opacity: 0,
    ...(scale !== undefined ? { scale } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
    duration,
    stagger,
    ease: "power3.out",
    scrollTrigger: {
      trigger: trigger ?? (targets as gsap.DOMTarget),
      start,
      once: true,
    },
  });
}

export { gsap, ScrollTrigger };
