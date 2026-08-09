"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@buzz/ui";
import { gsap, revealOnScroll, useGsapContext } from "../../lib/gsap";

/**
 * The close. Near-black panel so the bright ones that came before land as
 * a burst rather than a constant shout, and the last thing on screen is
 * the one action worth taking.
 */
export function ClosingPanel() {
  const scope = useRef<HTMLElement>(null);

  useGsapContext(() => {
    revealOnScroll(".close-line", { y: 34, stagger: 0.1 });

    // The hex breathes slowly — the "something is always happening here"
    // idea, held for the length of the section rather than announced.
    gsap.to(".close-hex", {
      rotate: 360,
      duration: 60,
      repeat: -1,
      ease: "none",
    });
  }, scope);

  return (
    <section
      ref={scope}
      className="relative overflow-hidden bg-graphite-950 py-28 text-text-primary-dark"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 opacity-[0.07]"
      >
        <svg viewBox="0 0 52 52" className="close-hex h-[28rem] w-[28rem]">
          <path
            d="M 26 0 L 49 13 L 49 39 L 26 52 L 3 39 L 3 13 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
        </svg>
      </div>

      <div className="shell-column relative z-10 max-w-3xl">
        <p className="close-line font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          one feed · one wallet · one score
        </p>
        <h2 className="close-line display-xl mt-5 text-4xl sm:text-6xl">
          Your campus already
          <br />
          helps each other.
          <br />
          <span className="text-pop-lime">This just keeps the receipts.</span>
        </h2>

        <p className="close-line mt-7 max-w-xl text-lg leading-relaxed text-text-muted">
          Every fix, every session, every project you shipped — recorded,
          verifiable, and yours to export the day someone asks what you
          actually did at university.
        </p>

        <div className="close-line mt-10 flex flex-wrap items-center gap-4">
          <Button asChild variant="pop-light" size="xl">
            <Link href="/register">
              Join with your campus email
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Link
            href="/login"
            className="text-base font-semibold text-text-muted underline decoration-2 underline-offset-[6px] transition-colors hover:text-text-primary-dark"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </section>
  );
}
