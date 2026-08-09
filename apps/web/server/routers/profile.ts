// One profile, one score, one history — across all three categories.

import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { contributionEvents, posts, reviews, users, wallets } from "@buzz/db";
import {
  CATEGORY_LABEL,
  contributionRecord,
  crossCategoryAdoption,
  getBuzzScore,
  leaderboard,
  pointsToNextTier,
  TIER_LABEL,
  updateProfileSchema,
  visiblePostsFilter,
} from "@buzz/core";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const profileRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.viewer) return null;
    const [user] = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        balance: wallets.balance,
      })
      .from(users)
      .leftJoin(wallets, eq(wallets.userId, users.id))
      .where(eq(users.id, ctx.viewer.id))
      .limit(1);

    return user ?? null;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          department: users.department,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "No such person" });

      const [score, activity, recentPosts, received] = await Promise.all([
        getBuzzScore(input.id, ctx.db),
        ctx.db
          .select({
            category: posts.category,
            posted: sql<number>`COUNT(*)::int`,
            completed: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
          })
          .from(posts)
          .where(and(eq(posts.authorId, input.id), eq(posts.isAnonymous, false)))
          .groupBy(posts.category),
        ctx.db
          .select({
            id: posts.id,
            title: posts.title,
            category: posts.category,
            type: posts.type,
            status: posts.status,
            createdAt: posts.createdAt,
            creditAmount: posts.creditAmount,
            metadata: posts.metadata,
            locationName: posts.locationName,
            upvoteCount: posts.upvoteCount,
          })
          .from(posts)
          .where(
            and(
              eq(posts.authorId, input.id),
              visiblePostsFilter(ctx.viewer),
            ),
          )
          .orderBy(desc(posts.createdAt))
          .limit(12),
        ctx.db
          .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            createdAt: reviews.createdAt,
            reviewerName: users.name,
          })
          .from(reviews)
          .leftJoin(users, eq(users.id, reviews.reviewerId))
          .where(eq(reviews.revieweeId, input.id))
          .orderBy(desc(reviews.createdAt))
          .limit(6),
      ]);

      return {
        user,
        score: {
          ...score,
          tierLabel: TIER_LABEL[score.tier],
          nextTier: pointsToNextTier(score.total),
        },
        activity,
        recentPosts,
        reviews: received,
      };
    }),

  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.department !== undefined
            ? { department: input.department }
            : {}),
        })
        .where(eq(users.id, ctx.viewer.id))
        .returning();
      return updated;
    }),

  /**
   * The Verified Contributions export (docs/PRD.md §6.4 #7) — one document
   * covering issues fixed, hours taught and projects shipped. Returned as
   * structured data; the page renders it and hands it to the print dialog,
   * which keeps a PDF dependency out of the bundle.
   */
  contributionRecord: protectedProcedure.query(async ({ ctx }) => {
    const [score, records] = await Promise.all([
      getBuzzScore(ctx.viewer.id, ctx.db),
      Promise.all(
        (["campus", "skills", "builds"] as const).map(async (category) => ({
          category,
          label: CATEGORY_LABEL[category],
          events: await contributionRecord(ctx.viewer.id, category, ctx.db),
        })),
      ),
    ]);

    const [user] = await ctx.db
      .select({ name: users.name, email: users.email, department: users.department })
      .from(users)
      .where(eq(users.id, ctx.viewer.id))
      .limit(1);

    const detailed = await ctx.db
      .select({
        category: contributionEvents.category,
        points: contributionEvents.points,
        createdAt: contributionEvents.createdAt,
        postTitle: posts.title,
        postStatus: posts.status,
      })
      .from(contributionEvents)
      .leftJoin(posts, eq(posts.id, contributionEvents.postId))
      .where(eq(contributionEvents.userId, ctx.viewer.id))
      .orderBy(desc(contributionEvents.createdAt));

    return {
      user,
      score,
      summary: records.map((r) => ({
        category: r.category,
        label: r.label,
        count: r.events.length,
        points: r.events.reduce((sum, e) => sum + e.points, 0),
      })),
      detailed,
      issuedAt: new Date(),
    };
  }),

  leaderboard: publicProcedure.query(async ({ ctx }) => {
    const rows = await leaderboard(8, ctx.db);
    if (rows.length === 0) return [];

    const people = await ctx.db
      .select({ id: users.id, name: users.name, department: users.department })
      .from(users);
    const byId = new Map(people.map((p) => [p.id, p]));

    return rows.map((row) => ({
      userId: row.userId,
      total: Number(row.total),
      categories: Number(row.categories),
      name: byId.get(row.userId ?? "")?.name ?? "Someone",
      department: byId.get(row.userId ?? "")?.department ?? null,
    }));
  }),

  /** The metric that decides whether the one-feed model actually worked. */
  crossCategory: publicProcedure.query(({ ctx }) => crossCategoryAdoption(ctx.db)),
});
