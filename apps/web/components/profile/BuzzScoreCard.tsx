"use client";

import { Star } from "lucide-react";
import { CATEGORY, Surface, cn, type CategoryKey } from "@buzz/ui";

/**
 * The ONE Buzz Score.
 *
 * Deliberately rendered as a single number with a single bar underneath it,
 * where the bar is *segmented* by category. That's the difference between
 * "one score, here's where it came from" and "three sub-scores shown next
 * to each other" (docs/BUILD_PLAN.md Phase 6) — the second would undo the
 * entire argument of the platform.
 */
export function BuzzScoreCard({
  score,
}: {
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
  const entries = (Object.keys(CATEGORY) as CategoryKey[]).map((key) => ({
    key,
    value: score.byCategory[key] ?? 0,
  }));
  const sum = entries.reduce((acc, entry) => acc + entry.value, 0);

  return (
    <Surface className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.1em] text-text-muted">
          Buzz Score
        </p>
        <span className="text-xs text-text-muted">{score.tierLabel}</span>
      </div>

      <p className="mt-2 font-mono text-5xl tabular-nums leading-none text-text-primary-dark">
        {score.total}
      </p>

      {/* one bar, segmented by where the points came from */}
      <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-sm bg-graphite-700">
        {sum === 0 ? null : (
          entries.map((entry) =>
            entry.value === 0 ? null : (
              <span
                key={entry.key}
                className={cn("h-full", CATEGORY[entry.key].edge)}
                style={{ width: `${(entry.value / sum) * 100}%` }}
                title={`${CATEGORY[entry.key].label}: ${entry.value}`}
              />
            ),
          )
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("h-1.5 w-1.5 rounded-sm", CATEGORY[entry.key].dot)}
            />
            <span className="text-xs text-text-muted">
              {CATEGORY[entry.key].label}
            </span>
            <span className="font-mono text-xs tabular-nums text-text-primary-dark">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1.5 border-t border-graphite-700 pt-3 text-xs text-text-muted">
        <p>
          <span className="font-mono tabular-nums text-text-primary-dark">
            {score.contributions}
          </span>{" "}
          contributions across{" "}
          <span className="font-mono tabular-nums text-text-primary-dark">
            {score.categoriesActive}
          </span>{" "}
          {score.categoriesActive === 1 ? "category" : "categories"}
        </p>

        {score.averageRating !== null ? (
          <p className="flex items-center gap-1.5">
            <Star className="h-3 w-3 fill-warning-500 text-warning-500" />
            <span className="font-mono tabular-nums text-text-primary-dark">
              {score.averageRating.toFixed(1)}
            </span>
            from {score.ratingCount}{" "}
            {score.ratingCount === 1 ? "review" : "reviews"}
          </p>
        ) : null}

        {score.nextTier ? (
          <p>
            <span className="font-mono tabular-nums text-text-primary-dark">
              {score.nextTier.needed}
            </span>{" "}
            more to reach {score.nextTier.next}
          </p>
        ) : null}
      </div>
    </Surface>
  );
}
