"use client";

import { motion } from "framer-motion";
import { cn } from "../utils/cn";
import { categoryTokens, statusTokens } from "../utils/category";
import { formatStamp } from "../utils/time";

/**
 * The shared lifecycle timeline — docs/DESIGN_SYSTEM.md §5, signature
 * moment 3. The SAME component renders on every /posts/[id] page whatever
 * the category, and on /builds/[id] for the pipeline. Only the accent
 * colour changes. That's the point: seeing one visual language for a broken
 * AC, a tutoring session and a startup's funding stage is what makes the
 * shared architecture legible in the interface, not just the schema.
 *
 * Motion is a 180ms spring on the rail fill only — no per-step fade-ups.
 */

export type TimelineStep = {
  key: string;
  label: string;
  /** filled once the post has passed through this step */
  reached: boolean;
  current: boolean;
  at?: Date | string | null;
  actor?: string | null;
  note?: string | null;
};

export function LifecycleTimeline({
  steps,
  category,
  className,
  orientation = "horizontal",
  derailed,
}: {
  steps: TimelineStep[];
  category: string;
  className?: string;
  orientation?: "horizontal" | "vertical";
  /** reopened / cancelled — the happy path was left */
  derailed?: { status: string; label: string } | null;
}) {
  const tokens = categoryTokens(category);
  const reachedCount = steps.filter((s) => s.reached).length;
  const progress =
    steps.length <= 1 ? 0 : (Math.max(0, reachedCount - 1) / (steps.length - 1)) * 100;

  if (orientation === "vertical") {
    return (
      <ol className={cn("relative space-y-0", className)}>
        {steps.map((step, index) => (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[3px] top-3 h-full w-px",
                  step.reached ? tokens.edge : "bg-graphite-700",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-1 h-[7px] w-[7px] shrink-0 rounded-sm",
                step.reached ? tokens.dot : "bg-graphite-700",
                step.current && "ring-2 ring-offset-2 ring-offset-graphite-800",
                step.current && tokens.text,
              )}
            />
            <div className="min-w-0 flex-1 -mt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={cn(
                    "text-sm",
                    step.reached
                      ? "text-text-primary-dark"
                      : "text-text-muted/60",
                  )}
                >
                  {step.label}
                </span>
                {step.at ? (
                  <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                    {formatStamp(step.at)}
                  </time>
                ) : null}
              </div>
              {step.actor ? (
                <p className="mt-0.5 text-xs text-text-muted">{step.actor}</p>
              ) : null}
              {step.note ? (
                <p className="mt-1 border-l border-graphite-700 pl-2 text-xs leading-relaxed text-text-muted">
                  {step.note}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* rail */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[5px] h-px bg-graphite-700"
        />
        <motion.div
          aria-hidden
          className={cn("absolute left-0 top-[5px] h-px", tokens.edge)}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.6 }}
        />
        <ol className="relative flex justify-between">
          {steps.map((step) => (
            <li
              key={step.key}
              className="flex min-w-0 flex-col items-center gap-2 first:items-start last:items-end"
            >
              <motion.span
                aria-hidden
                initial={false}
                animate={{ scale: step.current ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className={cn(
                  "h-[11px] w-[11px] rounded-sm border-2",
                  step.reached
                    ? cn(tokens.dot, "border-transparent")
                    : "border-graphite-700 bg-graphite-950",
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.08em]",
                  step.current
                    ? tokens.tagText
                    : step.reached
                      ? "text-text-muted"
                      : "text-text-muted/40",
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {derailed ? (
        <div className="mt-4 flex items-center gap-2 rounded-sm border border-danger-500/30 bg-danger-500/5 px-3 py-2">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", statusTokens(derailed.status).dot)}
            aria-hidden
          />
          <span className="text-xs text-danger-500">{derailed.label}</span>
        </div>
      ) : null}
    </div>
  );
}

