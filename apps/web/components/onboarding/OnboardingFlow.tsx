"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  HandHeart,
  Hammer,
  Lightbulb,
  Lock,
  MapPin,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button, cn } from "@buzz/ui";

/**
 * Onboarding — four full-screen colour panels.
 *
 * These exist because Buzz's core idea is genuinely unusual: a broken tap
 * and a tutoring session being the same kind of object is not something
 * anyone guesses from looking at a feed. Four screens is the budget; past
 * that people start hammering Skip and learn nothing.
 *
 * Everything is skippable from step one, and the last step hands off into
 * the in-app tour rather than dumping you on an empty feed.
 */
export function OnboardingFlow({ firstName }: { firstName: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const finish = useCallback(() => {
    // The dashboard tour picks up from here.
    try {
      window.localStorage.setItem("buzz.onboarded", "1");
    } catch {
      // Private mode — the tour will simply offer itself again.
    }
    router.push("/feed?tour=1");
  }, [router]);

  const go = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= STEPS.length) {
        finish();
        return;
      }
      setDirection(next > step ? 1 : -1);
      setStep(next);
    },
    [step, finish],
  );

  // Arrow keys, because a four-panel flow that ignores them feels broken.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "Enter") go(step + 1);
      if (event.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step]);

  const current = STEPS[step]!;

  return (
    <div
      className={cn(
        "pop-panel grain relative min-h-[100dvh] overflow-hidden transition-colors duration-500",
        current.bg,
        current.dark && "text-white",
      )}
    >
      {/* progress + skip */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === step
                  ? cn("w-7", current.dark ? "bg-white" : "bg-ink")
                  : cn("w-1.5", current.dark ? "bg-white/35" : "bg-ink/25"),
              )}
            />
          ))}
        </div>
        <span className="sr-only" aria-live="polite">
          Step {step + 1} of {STEPS.length}
        </span>

        <button
          type="button"
          onClick={finish}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
            current.dark
              ? "text-white/60 hover:bg-white/10 hover:text-white"
              : "text-ink/55 hover:bg-ink/10 hover:text-ink",
          )}
        >
          Skip
        </button>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-xl flex-col items-center justify-center px-6 pb-24 text-center">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction * 60, scale: 0.96 }
            }
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction * -60, scale: 0.96 }
            }
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="w-full"
          >
            <current.Art dark={current.dark} />

            <p className="mt-10 font-mono text-xs uppercase tracking-[0.18em] opacity-60">
              {step === 0 ? `Hey ${firstName}` : current.eyebrow}
            </p>

            <h1 className="display-xl mt-4 text-4xl sm:text-5xl">
              {current.title}
            </h1>

            <p
              className={cn(
                "mx-auto mt-5 max-w-md text-base font-medium leading-relaxed",
                current.dark ? "text-white/75" : "text-ink/70",
              )}
            >
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls */}
      <footer className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 px-5 pb-8 sm:px-8">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition",
            "disabled:pointer-events-none disabled:opacity-0",
            current.dark
              ? "text-white/70 hover:bg-white/10"
              : "text-ink/60 hover:bg-ink/10",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Button
          variant={current.dark ? "pop-light" : "pop"}
          size="lg"
          onClick={() => go(step + 1)}
        >
          {step === STEPS.length - 1 ? "Take me in" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}

// ── the panels ─────────────────────────────────────────────────────────

function AskGiveArt({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {[
        { icon: HandHeart, label: "ASK", tilt: "-8deg", bg: "bg-white" },
        { icon: Lightbulb, label: "GIVE", tilt: "8deg", bg: "bg-pop-yellow" },
      ].map((card) => (
        <motion.div
          key={card.label}
          initial={{ rotate: 0, y: 20, opacity: 0 }}
          animate={{ rotate: card.tilt, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          className={cn(
            "flex h-32 w-28 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-ink shadow-pop",
            card.bg,
          )}
        >
          <card.icon className="h-7 w-7 text-ink" strokeWidth={2.2} />
          <span className="font-mono text-xs font-bold tracking-[0.14em] text-ink">
            {card.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function CategoryArt({ dark }: { dark?: boolean }) {
  const cells = [
    { icon: MapPin, label: "Campus", fill: "#F0653C" },
    { icon: HandHeart, label: "Skills", fill: "#2F8F7D" },
    { icon: Hammer, label: "Builds", fill: "#6E56CF" },
  ];
  return (
    <div className="flex items-center justify-center gap-3">
      {cells.map((cell, index) => (
        <motion.div
          key={cell.label}
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 16,
            delay: 0.08 * index,
          }}
          className="flex flex-col items-center gap-2"
        >
          <span
            className="flex h-20 w-[4.5rem] items-center justify-center border-2 border-ink"
            style={{
              backgroundColor: cell.fill,
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          >
            <cell.icon className="h-6 w-6 text-white" strokeWidth={2.4} />
          </span>
          <span
            className={cn(
              "font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em]",
              dark ? "text-white/80" : "text-ink/70",
            )}
          >
            {cell.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function CreditArt({ dark }: { dark?: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-6 py-5 shadow-pop"
      >
        <Lock className="h-6 w-6 text-ink" strokeWidth={2.2} />
        <div className="text-left">
          <p className="font-mono text-3xl font-bold tabular-nums text-ink">
            2.00
          </p>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink/50">
            held in escrow
          </p>
        </div>
      </motion.div>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.35 }}
        className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-pop-lime"
      >
        <Sparkles className="h-5 w-5 text-ink" strokeWidth={2.4} />
      </motion.span>
    </div>
  );
}

function ScoreArt({ dark }: { dark?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="mx-auto w-56 rounded-2xl border-2 border-white bg-white/10 p-5"
    >
      <div className="flex items-center justify-between">
        <Trophy className="h-5 w-5" strokeWidth={2.2} />
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] opacity-60">
          buzz score
        </span>
      </div>
      <p className="mt-3 text-left font-mono text-5xl font-bold tabular-nums">
        127
      </p>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/20">
        {[
          { w: "38%", c: "bg-campus-ember-500" },
          { w: "42%", c: "bg-skills-teal-400" },
          { w: "20%", c: "bg-builds-violet-400" },
        ].map((seg, i) => (
          <motion.span
            key={i}
            initial={{ width: 0 }}
            animate={{ width: seg.w }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.12, ease: "easeOut" }}
            className={seg.c}
          />
        ))}
      </div>
      <p className="mt-3 text-left text-[0.7rem] leading-relaxed opacity-70">
        one number, three categories
      </p>
    </motion.div>
  );
}

const STEPS = [
  {
    bg: "bg-pop-lime",
    dark: false,
    eyebrow: "",
    title: "Everything here is an Ask or a Give",
    body: "A broken AC, an hour of tutoring, a teammate you're missing — same kind of post, same feed. That's the whole idea, and it's why you only need one app instead of three.",
    Art: AskGiveArt,
  },
  {
    bg: "bg-pop-yellow",
    dark: false,
    eyebrow: "three corners of campus",
    title: "Campus, Skills, Builds",
    body: "The category just decides which two or three extra fields you fill in. Everything still lands in the same list — so you'll see a tutor and a project opening on your way to report a broken tap.",
    Art: CategoryArt,
  },
  {
    bg: "bg-pop-pink",
    dark: false,
    eyebrow: "no awkward favours",
    title: "Credits keep it fair",
    body: "You start with 2. When someone accepts your Ask, the credits lock away until you both say it's done — so nobody's chasing anyone, and helping out actually adds up.",
    Art: CreditArt,
  },
  {
    bg: "bg-pop-violet",
    dark: true,
    eyebrow: "it follows you out",
    title: "One score for all of it",
    body: "Fixing things, teaching things and shipping things all count toward the same number. Export it as a verified record when someone asks what you did at university.",
    Art: ScoreArt,
  },
] as const;
