"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button, cn } from "@buzz/ui";
import { gsap, useGsapContext } from "../../lib/gsap";

/**
 * The hero. Acid-lime panel, black type, three hex cells assembling.
 *
 * The entrance is CSS (see `.rise` / `.rise-word` / `.pop-in` in
 * globals.css) rather than a GSAP timeline. That's a deliberate
 * correction: a JS `from()` tween sets opacity:0 immediately, so any
 * interruption strands the content invisible — which is precisely what
 * happened to the "Get started" button. CSS animations always resolve to
 * the natural state.
 *
 * GSAP is left with the one thing it's actually needed for here: the
 * scroll-scrubbed parallax as the panel leaves.
 *
 * The headline animates by word, not by character — character-by-character
 * on a six-word headline reads as "someone found a text-splitting plugin",
 * and it delays comprehension of the one sentence that has to land.
 */

const LINE_ONE = ["Ask", "for", "help."];
const LINE_TWO = ["Give", "a", "hand."];

export function HeroPanel() {
  const scope = useRef<HTMLElement>(null);

  useGsapContext(() => {
    // The panel drifts up slightly as you scroll off it, so the next
    // section feels like it's arriving rather than the page just moving.
    // If this never runs, the hero is simply static — nothing breaks.
    gsap.to(".hero-inner", {
      y: -60,
      opacity: 0.35,
      ease: "none",
      scrollTrigger: {
        trigger: scope.current,
        start: "top top",
        end: "bottom top",
        scrub: 0.6,
      },
    });
  }, scope);

  return (
    <section
      ref={scope}
      className="pop-panel grain relative overflow-hidden bg-pop-lime"
    >
      <div className="hero-inner shell-column relative z-10 grid items-center gap-12 pb-24 pt-32 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-32 lg:pt-36">
        <div>
          <p
            className="rise inline-flex items-center gap-2 rounded-full border-2 border-ink px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.16em]"
            style={{ animationDelay: "60ms" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute h-2 w-2 animate-ring-ping rounded-full bg-ink" />
              <span className="relative h-2 w-2 rounded-full bg-ink" />
            </span>
            your campus, live
          </p>

          <h1 className="display-xl mt-6 text-5xl sm:text-6xl lg:text-7xl">
            {[LINE_ONE, LINE_TWO].map((line, lineIndex) => (
              <span key={lineIndex} className="block">
                {line.map((word, wordIndex) => (
                  <span
                    key={word}
                    className="inline-block overflow-hidden align-bottom"
                  >
                    <span
                      className="rise-word"
                      style={{
                        animationDelay: `${180 + (lineIndex * 3 + wordIndex) * 70}ms`,
                      }}
                    >
                      {word}
                      {wordIndex < line.length - 1 ? " " : ""}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p
            className="rise mt-7 max-w-lg text-lg font-medium leading-relaxed text-ink/75"
            style={{ animationDelay: "560ms" }}
          >
            A broken AC. An hour of tutoring. A project missing an Arduino
            person. On Buzz they&apos;re all the same thing — one feed, one
            wallet, one score.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <span className="rise" style={{ animationDelay: "660ms" }}>
              <Button asChild variant="pop" size="xl">
                <Link href="/register">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </span>

            <Link
              href="/trust"
              className="rise group inline-flex items-center gap-2 text-base font-semibold underline decoration-2 underline-offset-[6px] transition-colors hover:text-ink/60"
              style={{ animationDelay: "740ms" }}
            >
              See what campus fixed
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <p
            className="rise mt-6 font-mono text-xs uppercase tracking-[0.14em] text-ink/50"
            style={{ animationDelay: "820ms" }}
          >
            Campus email only · 2 free credits to start
          </p>
        </div>

        <HexCluster />
      </div>

      {/* the ticker — proof the place is busy, in the platform's own words */}
      <div className="relative z-10 border-y-2 border-ink/15 bg-pop-lime-deep py-3">
        <div className="marquee-track gap-8">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex shrink-0 items-center gap-8 pl-8"
              aria-hidden={copy === 1}
            >
              {TICKER.map((item, index) => (
                <span
                  key={`${copy}-${index}`}
                  className="flex shrink-0 items-center gap-2.5 font-mono text-sm uppercase tracking-[0.1em]"
                >
                  <span
                    className={cn("h-2 w-2 rounded-sm", item.dot)}
                    aria-hidden
                  />
                  {item.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TICKER = [
  { label: "AC fixed in block C", dot: "bg-campus-ember-600" },
  { label: "React session booked", dot: "bg-skills-teal-600" },
  { label: "EcoTrack found a backend dev", dot: "bg-builds-violet-600" },
  { label: "Printer jam resolved in 4h", dot: "bg-campus-ember-600" },
  { label: "Thermo tutor at 2.0×", dot: "bg-skills-teal-600" },
  { label: "SolarSail reached launched", dot: "bg-builds-violet-600" },
];

/** Three hexagons assembling into one honeycomb — the brand idea, literally. */
function HexCluster() {
  const cells = [
    { key: "campus", x: 23, y: 0, fill: "#F0653C", delay: 320 },
    { key: "skills", x: 46, y: 39, fill: "#2F8F7D", delay: 430 },
    { key: "builds", x: 0, y: 39, fill: "#6E56CF", delay: 540 },
  ];

  return (
    <div className="relative justify-self-center">
      <svg
        viewBox="-8 -8 111 107"
        className="w-[19rem] max-w-full overflow-visible sm:w-[23rem]"
        role="img"
        aria-label="Three hexagonal cells — Campus, Skills and Builds — forming one honeycomb"
      >
        {cells.map((cell) => (
          <g
            key={cell.key}
            className="pop-in"
            style={{
              animationDelay: `${cell.delay}ms`,
              transformOrigin: `${cell.x + 26}px ${cell.y + 26}px`,
            }}
          >
            <g transform={`translate(${cell.x} ${cell.y})`}>
              <path
                d="M 26 0 L 49 13 L 49 39 L 26 52 L 3 39 L 3 13 Z"
                fill={cell.fill}
                stroke="#0B0D10"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              <circle cx={26} cy={26} r={4.5} fill="#0B0D10" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
