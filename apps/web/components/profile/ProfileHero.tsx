"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { FileText, Sparkles, Star, Trophy } from "lucide-react";
import { Button, CATEGORY, cn, type CategoryKey } from "@buzz/ui";

/**
 * The profile hero — the one working-surface page that gets the loud
 * register, because it isn't really a working surface. It's the page you
 * send someone when they ask what you did at university, and a Buzz Score
 * rendered as a small number in a sidebar undersells the entire premise.
 *
 * The panel takes the colour of whichever category you contribute to most,
 * so two people's profiles don't look identical — your profile ends up
 * looking like the kind of contributor you are.
 */
export function ProfileHero({
  name,
  department,
  role,
  joined,
  isSelf,
  score,
}: {
  name: string;
  department: string | null;
  role: string;
  joined: string | null;
  isSelf: boolean;
  score: {
    total: number;
    byCategory: Record<string, number>;
    categoriesActive: number;
    contributions: number;
    averageRating: number | null;
    ratingCount: number;
    tierLabel: string;
    nextTier: { next: string; needed: number } | null;
  };
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [shown, setShown] = useState(reduceMotion ? score.total : 0);

  // The score counts up once, on first sight. It's the number the whole
  // page is about — watching it climb is worth the 900ms.
  useEffect(() => {
    if (!inView || reduceMotion) {
      setShown(score.total);
      return;
    }
    const controls = animate(0, score.total, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setShown(Math.round(value)),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, score.total]);

  const entries = (Object.keys(CATEGORY) as CategoryKey[]).map((key) => ({
    key,
    value: score.byCategory[key] ?? 0,
  }));
  const sum = entries.reduce((acc, entry) => acc + entry.value, 0);

  // Dominant category decides the panel colour; nobody's contributed yet
  // means lime, which is the platform's own default.
  const dominant = entries.reduce(
    (best, entry) => (entry.value > best.value ? entry : best),
    entries[0]!,
  );
  const panel =
    sum === 0
      ? { bg: "bg-pop-lime", dark: false }
      : PANEL_FOR[dominant.key];

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <section
      ref={ref}
      className={cn(
        "pop-panel grain relative -mx-4 overflow-hidden rounded-none px-4 py-10 sm:-mx-6 sm:px-6 lg:rounded-2xl lg:border-2 lg:border-ink lg:px-10",
        panel.bg,
        panel.dark && "text-white",
      )}
    >
      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <motion.span
              initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-xl font-bold",
                panel.dark
                  ? "border-white bg-white/15 text-white"
                  : "border-ink bg-white text-ink shadow-pop-sm",
              )}
            >
              {initials || "?"}
            </motion.span>

            <div className="min-w-0">
              <h1 className="display-xl truncate text-3xl sm:text-4xl">
                {name}
              </h1>
              <p
                className={cn(
                  "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium",
                  panel.dark ? "text-white/70" : "text-ink/65",
                )}
              >
                {department ? <span>{department}</span> : null}
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.12em]",
                    panel.dark ? "border-white/40" : "border-ink/30",
                  )}
                >
                  {role}
                </span>
                {joined ? <span className="font-mono text-xs">{joined}</span> : null}
              </p>
            </div>
          </div>

          {/* the tier line — what the number means, in words */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold",
                panel.dark
                  ? "border-white bg-white/10"
                  : "border-ink bg-white shadow-pop-sm",
              )}
            >
              <Trophy className="h-4 w-4" strokeWidth={2.4} />
              {score.tierLabel}
            </span>

            {score.averageRating !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-semibold",
                  panel.dark ? "text-white/80" : "text-ink/70",
                )}
              >
                <Star className="h-4 w-4 fill-current" />
                {score.averageRating.toFixed(1)}
                <span className="font-normal opacity-70">
                  · {score.ratingCount}{" "}
                  {score.ratingCount === 1 ? "review" : "reviews"}
                </span>
              </span>
            ) : null}

            {score.categoriesActive >= 2 ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]",
                  panel.dark ? "bg-white/15" : "bg-ink text-white",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {score.categoriesActive} categories
              </span>
            ) : null}
          </div>

          {isSelf ? (
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant={panel.dark ? "pop-light" : "pop"} size="md">
                <Link href="/profile/export">
                  <FileText className="h-4 w-4" />
                  Export my record
                </Link>
              </Button>
              <Button
                asChild
                variant={panel.dark ? "pop-light" : "pop"}
                size="md"
                className={cn(
                  "border-2",
                  panel.dark
                    ? "!bg-transparent !text-white"
                    : "!bg-transparent !text-ink !shadow-none",
                )}
              >
                <Link href="/post/new">Post something</Link>
              </Button>
            </div>
          ) : null}
        </div>

        {/* the number */}
        <div className="shrink-0 lg:text-right">
          <p
            className={cn(
              "font-mono text-xs uppercase tracking-[0.16em]",
              panel.dark ? "text-white/55" : "text-ink/50",
            )}
          >
            buzz score
          </p>
          <p className="mt-1 font-mono text-7xl font-bold leading-none tabular-nums sm:text-8xl">
            {shown}
          </p>

          {/* one bar, segmented by where the points came from */}
          <div
            className={cn(
              "mt-5 flex h-3 w-full overflow-hidden rounded-full border-2 lg:w-72",
              panel.dark ? "border-white/70 bg-white/10" : "border-ink bg-white",
            )}
          >
            {sum === 0
              ? null
              : entries.map((entry) =>
                  entry.value === 0 ? null : (
                    <motion.span
                      key={entry.key}
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${(entry.value / sum) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      className={CATEGORY[entry.key].edge}
                      title={`${CATEGORY[entry.key].label}: ${entry.value}`}
                    />
                  ),
                )}
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 lg:justify-end">
            {entries.map((entry) => (
              <li key={entry.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 rounded-sm",
                    CATEGORY[entry.key].dot,
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    panel.dark ? "text-white/70" : "text-ink/65",
                  )}
                >
                  {CATEGORY[entry.key].label}
                </span>
                <span className="font-mono text-xs font-bold tabular-nums">
                  {entry.value}
                </span>
              </li>
            ))}
          </ul>

          {score.nextTier ? (
            <p
              className={cn(
                "mt-3 text-xs font-medium",
                panel.dark ? "text-white/60" : "text-ink/55",
              )}
            >
              <span className="font-mono font-bold">{score.nextTier.needed}</span>{" "}
              more to reach {score.nextTier.next}
            </p>
          ) : (
            <p
              className={cn(
                "mt-3 text-xs font-medium",
                panel.dark ? "text-white/60" : "text-ink/55",
              )}
            >
              Top tier — {score.contributions} contributions on record
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

const PANEL_FOR: Record<CategoryKey, { bg: string; dark: boolean }> = {
  campus: { bg: "bg-pop-yellow", dark: false },
  skills: { bg: "bg-pop-lime", dark: false },
  builds: { bg: "bg-pop-violet", dark: true },
};
