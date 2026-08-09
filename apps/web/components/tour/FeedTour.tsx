"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button, cn } from "@buzz/ui";

/**
 * The dashboard tour.
 *
 * Coach marks anchored to elements that are actually on the page, via
 * `data-tour` attributes — not a slideshow of screenshots, which goes
 * stale the moment the layout changes and teaches nobody where anything is.
 *
 * Two rules it follows:
 *   • A step whose target isn't on screen is SKIPPED, not shown pointing at
 *     nothing. The rail is hidden on mobile, so that happens routinely.
 *   • It runs once. After that it only reappears from ?tour=1, so the help
 *     is available without anyone being nagged.
 */

const SEEN_KEY = "buzz.tour.feed";

type Step = {
  target: string;
  title: string;
  body: string;
  placement?: "bottom" | "top";
};

const STEPS: Step[] = [
  {
    target: "feed-filters",
    title: "One list, not three tabs",
    body: "Everything on campus is here by default. The chips narrow it down — they don't switch you between separate apps.",
  },
  {
    target: "feed-sort",
    title: "Ranked for you",
    body: "“For you” pushes up things near you, skills you've offered, and your own posts that someone's waiting on. Switch to Newest for plain recency.",
  },
  {
    target: "feed-list",
    title: "Every card is an Ask or a Give",
    body: "The coloured edge tells you the category at a glance. Tap any card to see its full history and offer to help.",
  },
  {
    target: "scarcity-rail",
    title: "What your time is worth",
    body: "Skills nobody else is offering pay more. Teach one of the ones near the top and you'll earn above the base rate.",
    placement: "bottom",
  },
  {
    target: "post-button",
    title: "This is the only button that matters",
    body: "Need something or can offer something? Same button, three quick steps. Go on — the feed's better with you in it.",
  },
];

export function FeedTour() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Start either because we were sent here from onboarding, or because
  // this is a first visit and the tour has never run.
  useEffect(() => {
    if (!mounted) return;
    const forced = searchParams.get("tour") === "1";
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    if (forced || !seen) {
      // Let the feed finish its first paint so targets exist and have size.
      const timer = setTimeout(() => setActive(true), forced ? 400 : 1200);
      return () => clearTimeout(timer);
    }
  }, [mounted, searchParams]);

  const close = useCallback(() => {
    setActive(false);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode — it'll offer itself again next visit. Acceptable.
    }
    if (searchParams.get("tour") === "1") {
      router.replace("/feed", { scroll: false });
    }
  }, [router, searchParams]);

  // Find the next step that actually has a visible target.
  const resolveFrom = useCallback((start: number): number => {
    for (let i = start; i < STEPS.length; i++) {
      const node = document.querySelector<HTMLElement>(
        `[data-tour="${STEPS[i]!.target}"]`,
      );
      if (node && node.getBoundingClientRect().width > 0) return i;
    }
    return -1;
  }, []);

  useEffect(() => {
    if (!active) return;
    const resolved = resolveFrom(0);
    if (resolved === -1) {
      close();
      return;
    }
    setIndex(resolved);
  }, [active, resolveFrom, close]);

  // Measure the current target, and keep measuring while things move.
  useLayoutEffect(() => {
    if (!active) return;
    const step = STEPS[index];
    if (!step) return;

    const measure = () => {
      const node = document.querySelector<HTMLElement>(
        `[data-tour="${step.target}"]`,
      );
      if (!node) return setRect(null);
      setRect(node.getBoundingClientRect());
    };

    const node = document.querySelector<HTMLElement>(
      `[data-tour="${step.target}"]`,
    );
    node?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });

    const timer = setTimeout(measure, reduceMotion ? 0 : 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, index, reduceMotion]);

  const next = useCallback(() => {
    const resolved = resolveFrom(index + 1);
    if (resolved === -1) close();
    else setIndex(resolved);
  }, [index, resolveFrom, close]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight" || event.key === "Enter") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next]);

  if (!mounted || !active || !rect) return null;

  const step = STEPS[index]!;
  const pad = 10;
  const below = step.placement === "top" ? false : rect.bottom + 220 < window.innerHeight;

  const cardTop = below ? rect.bottom + pad + 8 : rect.top - pad - 8;
  const cardLeft = Math.min(
    Math.max(16, rect.left + rect.width / 2 - 170),
    window.innerWidth - 356,
  );

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="Feed tour">
      {/* Scrim with a hole cut over the target. Four panels rather than an
          SVG mask: it keeps the highlighted element genuinely clickable. */}
      <div className="pointer-events-none absolute inset-0">
        {[
          { top: 0, left: 0, width: "100%", height: Math.max(0, rect.top - pad) },
          {
            top: rect.bottom + pad,
            left: 0,
            width: "100%",
            height: Math.max(0, window.innerHeight - rect.bottom - pad),
          },
          {
            top: rect.top - pad,
            left: 0,
            width: Math.max(0, rect.left - pad),
            height: rect.height + pad * 2,
          },
          {
            top: rect.top - pad,
            left: rect.right + pad,
            width: Math.max(0, window.innerWidth - rect.right - pad),
            height: rect.height + pad * 2,
          },
        ].map((panel, i) => (
          <div
            key={i}
            className="pointer-events-auto absolute bg-graphite-950/78"
            style={panel}
            onClick={close}
          />
        ))}
      </div>

      {/* the ring around the target */}
      <motion.div
        initial={false}
        animate={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 300, damping: 32 }
        }
        className="pointer-events-none absolute rounded-xl border-2 border-pop-lime"
        style={{ boxShadow: "0 0 0 3px rgba(198,248,50,0.22)" }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: below ? -10 : 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className={cn(
            "absolute w-[21rem] max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-ink",
            "bg-pop-lime p-5 text-ink shadow-pop",
          )}
          style={{
            left: cardLeft,
            ...(below ? { top: cardTop } : { top: Math.max(16, cardTop - 190) }),
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ink/55">
              {index + 1} / {STEPS.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close the tour"
              className="-mr-1 -mt-1 rounded-full p-1 text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="mt-2 font-display text-lg font-bold leading-snug tracking-tight">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/75">{step.body}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={close}
              className="text-sm font-semibold text-ink/55 transition-colors hover:text-ink"
            >
              Skip the tour
            </button>
            <Button variant="pop" size="sm" onClick={next}>
              {index === STEPS.length - 1 ? "Got it" : "Next"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
