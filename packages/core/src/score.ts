// packages/core/score.ts
//
// The ONE Buzz Score. It is a single number summed over contribution_events
// across all three categories — deliberately not three sub-scores rendered
// next to each other (docs/BUILD_PLAN.md Phase 6). The per-category split is
// returned alongside it purely so the profile can show *where* the number
// came from, and because the platform's headline metric is "% of users with
// activity in 2+ categories" (docs/PRD.md §12).

import { and, eq, sql as raw } from "drizzle-orm";
import {
  contributionEvents,
  db as defaultDb,
  reviews,
  type Category,
  type Executor,
} from "@buzz/db";

export type BuzzScore = {
  /** the one number */
  total: number;
  /** where it came from — display only, never a separate score */
  byCategory: Record<Category, number>;
  categoriesActive: number;
  contributions: number;
  averageRating: number | null;
  ratingCount: number;
  tier: ScoreTier;
};

export type ScoreTier = "newcomer" | "contributor" | "regular" | "pillar";

export function tierFor(total: number): ScoreTier {
  if (total >= 400) return "pillar";
  if (total >= 150) return "regular";
  if (total >= 40) return "contributor";
  return "newcomer";
}

export const TIER_LABEL: Record<ScoreTier, string> = {
  newcomer: "Newcomer",
  contributor: "Contributor",
  regular: "Regular",
  pillar: "Campus pillar",
};

/** Points still needed to reach the next tier, or null at the top. */
export function pointsToNextTier(total: number): { next: ScoreTier; needed: number } | null {
  if (total < 40) return { next: "contributor", needed: 40 - total };
  if (total < 150) return { next: "regular", needed: 150 - total };
  if (total < 400) return { next: "pillar", needed: 400 - total };
  return null;
}

export async function getBuzzScore(
  userId: string,
  executor?: Executor,
): Promise<BuzzScore> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;

  const rows = await tx
    .select({
      category: contributionEvents.category,
      points: raw<number>`COALESCE(SUM(${contributionEvents.points}), 0)::int`,
      count: raw<number>`COUNT(*)::int`,
    })
    .from(contributionEvents)
    .where(eq(contributionEvents.userId, userId))
    .groupBy(contributionEvents.category);

  const byCategory: Record<Category, number> = {
    campus: 0,
    skills: 0,
    builds: 0,
  };
  let contributions = 0;

  for (const row of rows) {
    byCategory[row.category as Category] = Number(row.points ?? 0);
    contributions += Number(row.count ?? 0);
  }

  const [ratingRow] = await tx
    .select({
      avg: raw<string>`COALESCE(AVG(${reviews.rating}), 0)::text`,
      count: raw<number>`COUNT(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, userId));

  const ratingCount = Number(ratingRow?.count ?? 0);
  const averageRating = ratingCount > 0 ? Number(ratingRow?.avg ?? 0) : null;

  const base = byCategory.campus + byCategory.skills + byCategory.builds;

  // A rating above 3 nudges the score up, below 3 nudges it down — capped
  // at ±10% so reputation shades the number without being the number.
  const ratingFactor =
    averageRating === null ? 1 : 1 + ((averageRating - 3) / 2) * 0.1;

  const total = Math.max(0, Math.round(base * ratingFactor));

  return {
    total,
    byCategory,
    categoriesActive: Object.values(byCategory).filter((v) => v > 0).length,
    contributions,
    averageRating,
    ratingCount,
    tier: tierFor(total),
  };
}

/**
 * The platform's real success metric: the share of users who have completed
 * something in two or more different categories (docs/PRD.md §12). If the
 * one-feed model works, this number is high; if Buzz is really three tools
 * in a trench coat, it collapses toward zero.
 */
export async function crossCategoryAdoption(
  executor?: Executor,
): Promise<{ multiCategoryUsers: number; activeUsers: number; rate: number }> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;

  const [row] = await tx
    .select({
      active: raw<number>`COUNT(*)::int`,
      multi: raw<number>`COUNT(*) FILTER (WHERE categories >= 2)::int`,
    })
    .from(
      tx
        .select({
          userId: contributionEvents.userId,
          categories: raw<number>`COUNT(DISTINCT ${contributionEvents.category})::int`.as(
            "categories",
          ),
        })
        .from(contributionEvents)
        .groupBy(contributionEvents.userId)
        .as("per_user"),
    );

  const activeUsers = Number(row?.active ?? 0);
  const multiCategoryUsers = Number(row?.multi ?? 0);

  return {
    multiCategoryUsers,
    activeUsers,
    rate: activeUsers === 0 ? 0 : Math.round((multiCategoryUsers / activeUsers) * 100),
  };
}

/** Top contributors platform-wide, for the Trust dashboard. */
export async function leaderboard(limit = 8, executor?: Executor) {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  return tx
    .select({
      userId: contributionEvents.userId,
      total: raw<number>`COALESCE(SUM(${contributionEvents.points}), 0)::int`,
      categories: raw<number>`COUNT(DISTINCT ${contributionEvents.category})::int`,
    })
    .from(contributionEvents)
    .groupBy(contributionEvents.userId)
    .orderBy(raw`COALESCE(SUM(${contributionEvents.points}), 0) DESC`)
    .limit(limit);
}

/** Contribution breakdown for the exportable Verified Contributions record. */
export async function contributionRecord(
  userId: string,
  category: Category,
  executor?: Executor,
) {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  return tx
    .select()
    .from(contributionEvents)
    .where(
      and(
        eq(contributionEvents.userId, userId),
        eq(contributionEvents.category, category),
      ),
    );
}
