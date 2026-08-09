"use client";

import { useRef } from "react";
import { cn } from "@buzz/ui";
import { gsap, useGsapContext } from "../../lib/gsap";

/**
 * The argument of the whole product, as a scroll animation.
 *
 * Three separate stacks — a complaints tool, a tutoring tool, a project
 * board — slide together into ONE list as you scroll. It's scrubbed to the
 * scrollbar rather than played on entry, so you're doing the merging; the
 * point lands because you performed it, not because you watched it.
 *
 * Two things this gets right that the first version didn't:
 *
 *   • GSAP owns the transforms outright. The tilt used to be set with the
 *     CSS `rotate` property while GSAP animated `transform` — two separate
 *     systems writing the same visual, which composited into skewed,
 *     wobbly cards. Now `gsap.set()` establishes the tilt.
 *
 *   • The stage has a reserved height. The merged list is absolutely
 *     positioned so it can sit on top of the stacks, which meant it
 *     escaped the flow and collided with the payoff line underneath.
 */
export function ConvergePanel() {
  const scope = useRef<HTMLElement>(null);

  useGsapContext(() => {
    // Hand over from the CSS fallback (which shows the merged state) to
    // the animated version, and only then set the split starting layout.
    scope.current?.setAttribute("data-anim", "on");

    gsap.set(".stack-campus", { rotate: -7, xPercent: 0 });
    gsap.set(".stack-skills", { rotate: 3 });
    gsap.set(".stack-builds", { rotate: 8 });
    gsap.set(".merged-feed", { opacity: 0 });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: scope.current,
        start: "top top",
        end: "+=1700",
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
      },
    });

    timeline
      .to(".converge-label", { opacity: 0, y: -14, duration: 0.4 }, 0)
      // The three columns slide to centre and straighten up.
      .to(".stack-campus", { xPercent: 50, rotate: 0, duration: 1 }, 0.15)
      .to(".stack-builds", { xPercent: -50, rotate: 0, duration: 1 }, 0.15)
      .to(".stack-skills", { rotate: 0, duration: 1 }, 0.15)
      // Then they resolve into a single interleaved column.
      .to(".stack-column", { scale: 0.94, duration: 0.5 }, 0.9)
      .to(".merged-feed", { opacity: 1, duration: 0.5 }, 1.1)
      .to(".stack-column", { opacity: 0, duration: 0.4 }, 1.1)
      .from(
        ".merged-row",
        { y: 26, opacity: 0, duration: 0.5, stagger: 0.09 },
        1.2,
      )
      .from(".converge-payoff", { y: 20, opacity: 0, duration: 0.5 }, 1.7);
  }, scope);

  return (
    <section
      ref={scope}
      data-anim="off"
      className="pop-panel grain relative flex min-h-screen items-center overflow-hidden bg-pop-yellow"
    >
      <div className="shell-column relative z-10 w-full py-16">
        <p className="converge-label mx-auto mb-8 max-w-xl text-center text-base font-semibold text-ink/70 sm:text-lg">
          Three problems. Most campuses buy three tools for them — and most
          students only ever open one.
        </p>

        {/* The stage. A reserved height, because the merged list is absolute
            and would otherwise collapse the flow onto the payoff line. */}
        <div className="relative mx-auto min-h-[19rem] max-w-3xl sm:min-h-[21rem]">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {STACKS.map((stack) => (
              <div
                key={stack.key}
                className={cn("stack-column", `stack-${stack.key}`)}
              >
                <p className="mb-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink/55 sm:text-[0.65rem]">
                  {stack.tool}
                </p>
                <div className="space-y-2.5">
                  {stack.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border-2 border-ink bg-white/90 px-3 py-2.5 text-[0.7rem] font-medium leading-snug shadow-pop-sm sm:text-xs"
                    >
                      <span
                        className={cn(
                          "mb-1.5 block h-1.5 w-8 rounded-sm",
                          stack.dot,
                        )}
                        aria-hidden
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* the merged result, revealed on top */}
          <div className="merged-feed absolute inset-x-0 top-0">
            <p className="mb-3 text-center font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink/55">
              buzz — one feed
            </p>
            <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-pop">
              {MERGED.map((row) => (
                <div
                  key={row.title}
                  className="merged-row flex items-center gap-3 border-b-2 border-ink/10 px-4 py-2.5 last:border-b-0"
                >
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", row.dot)}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.title}
                  </span>
                  <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink/45">
                    {row.kind}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="converge-payoff mx-auto mt-10 max-w-2xl text-center text-xl font-bold leading-snug sm:text-2xl">
          One list. So the person who came to report a broken tap scrolls past
          a tutor and a teammate on the way out.
        </p>
      </div>
    </section>
  );
}

const STACKS = [
  {
    key: "campus",
    tool: "complaint portal",
    dot: "bg-campus-ember-500",
    items: ["AC broken, Block C", "Tap running since Sunday", "Printer jammed"],
  },
  {
    key: "skills",
    tool: "tutoring group",
    dot: "bg-skills-teal-500",
    items: ["Need thermo help", "I can teach React", "Figma, 45 min"],
  },
  {
    key: "builds",
    tool: "project archive",
    dot: "bg-builds-violet-500",
    items: ["EcoTrack needs backend", "SolarSail — launched", "Mess forecasting"],
  },
];

const MERGED = [
  { title: "AC in Block C has been dead three days", kind: "ask", dot: "bg-campus-ember-500" },
  { title: "I can teach React — hooks, state, the works", kind: "give", dot: "bg-skills-teal-500" },
  { title: "EcoTrack needs an embedded-systems person", kind: "ask", dot: "bg-builds-violet-500" },
  { title: "Need help with thermodynamics before Friday", kind: "ask", dot: "bg-skills-teal-500" },
  { title: "Hostel B tap running since Sunday", kind: "ask", dot: "bg-campus-ember-500" },
];
