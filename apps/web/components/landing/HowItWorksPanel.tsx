"use client";

import { useRef } from "react";
import { HandHeart, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { cn } from "@buzz/ui";
import { revealOnScroll, useGsapContext } from "../../lib/gsap";

/**
 * How the loop works, in four beats. Hot-pink panel.
 *
 * The cards tilt back to straight as they arrive — a small physical
 * gesture that costs nothing and makes the section feel handled rather
 * than laid out.
 */
export function HowItWorksPanel() {
  const scope = useRef<HTMLElement>(null);

  useGsapContext(() => {
    revealOnScroll(".how-heading", { y: 32 });
    revealOnScroll(".how-step", {
      y: 44,
      rotate: 4,
      stagger: 0.12,
      duration: 0.75,
      trigger: ".how-grid",
    });
  }, scope);

  return (
    <section
      ref={scope}
      className="pop-panel grain relative overflow-hidden bg-pop-pink"
    >
      <div className="shell-column relative z-10 py-24">
        <div className="how-heading max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink/60">
            the whole loop
          </p>
          <h2 className="display-xl mt-4 text-4xl sm:text-5xl">
            Post it. Someone picks it up. Everyone gets the credit.
          </h2>
        </div>

        <div className="how-grid mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className={cn(
                "how-step relative rounded-2xl border-2 border-ink bg-white p-6 shadow-pop",
              )}
            >
              <span className="absolute -top-3 -left-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-pop-yellow font-mono text-sm font-bold">
                {index + 1}
              </span>
              <step.icon className="h-6 w-6" strokeWidth={2.2} />
              <h3 className="mt-4 text-lg font-bold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                {step.body}
              </p>
            </article>
          ))}
        </div>

        <p className="how-heading mt-10 max-w-xl text-base font-medium text-ink/70">
          Every post walks the same five states, whatever it is — and leaves a
          permanent, timestamped record that nobody can quietly edit.
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: HandHeart,
    title: "Ask or Give",
    body: "One button. Say what you need, or what you can do. Pick a category and you're done.",
  },
  {
    icon: Sparkles,
    title: "It finds the right people",
    body: "Nearby for campus stuff, matching skills for tutoring, matching tags for project roles.",
  },
  {
    icon: ShieldCheck,
    title: "Both sides confirm",
    body: "Credits sit in escrow while the work happens. Campus fixes close with an after-photo.",
  },
  {
    icon: Wallet,
    title: "It counts, permanently",
    body: "One wallet, one Buzz Score across all three. Export it when you're job hunting.",
  },
];
