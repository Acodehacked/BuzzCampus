// The one wallet. Credits earned fixing a Campus issue, teaching a Skills
// session or hitting a Builds milestone all land here (docs/PRD.md §3).

import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ledgerEntries, posts, scarcitySnapshots } from "@buzz/db";
import {
  getBalance,
  getCurrentScarcity,
  recomputeScarcityIndex,
  reconcileWallet,
  scarcitySpread,
  subtractCredits,
} from "@buzz/core";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const walletRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const [balance, breakdown] = await Promise.all([
      getBalance(ctx.viewer.id, ctx.db),
      ctx.db
        .select({
          category: posts.category,
          earned: sql<string>`COALESCE(SUM(${ledgerEntries.amount}) FILTER (WHERE ${ledgerEntries.direction} = 'credit'), 0)::text`,
          spent: sql<string>`COALESCE(SUM(${ledgerEntries.amount}) FILTER (WHERE ${ledgerEntries.direction} = 'debit'), 0)::text`,
        })
        .from(ledgerEntries)
        .leftJoin(posts, eq(posts.id, ledgerEntries.postId))
        .where(eq(ledgerEntries.userId, ctx.viewer.id))
        .groupBy(posts.category),
    ]);

    // Credits still locked against work in progress — money you have
    // committed but not yet spent.
    const [held] = await ctx.db
      .select({
        amount: sql<string>`
          COALESCE(SUM(
            CASE WHEN ${ledgerEntries.reason} = 'escrow_lock' THEN ${ledgerEntries.amount}
                 WHEN ${ledgerEntries.reason} IN ('escrow_release','escrow_refund') THEN -${ledgerEntries.amount}
                 ELSE 0 END
          ), 0)::text
        `,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, ctx.viewer.id));

    return {
      balance,
      inEscrow: held?.amount ?? "0.00",
      byCategory: breakdown.map((row) => ({
        category: row.category ?? "platform",
        earned: row.earned,
        spent: row.spent,
        net: subtractCredits(row.earned, row.spent),
      })),
    };
  }),

  ledger: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 30;
      const offset = input.cursor ?? 0;

      const rows = await ctx.db
        .select({
          id: ledgerEntries.id,
          direction: ledgerEntries.direction,
          amount: ledgerEntries.amount,
          reason: ledgerEntries.reason,
          createdAt: ledgerEntries.createdAt,
          postId: ledgerEntries.postId,
          postTitle: posts.title,
          category: posts.category,
        })
        .from(ledgerEntries)
        .leftJoin(posts, eq(posts.id, ledgerEntries.postId))
        .where(eq(ledgerEntries.userId, ctx.viewer.id))
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = rows.length > limit;
      return {
        items: hasMore ? rows.slice(0, limit) : rows,
        nextCursor: hasMore ? offset + limit : null,
      };
    }),

  /** Proves the stored balance equals a replay of this wallet's own ledger. */
  reconcile: protectedProcedure.query(({ ctx }) =>
    reconcileWallet(ctx.viewer.id, ctx.db),
  ),

  /** The Scarcity Index — public, because it's the price list. */
  scarcity: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(24).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await getCurrentScarcity(ctx.db, input?.limit ?? 12);
      return { rows, spread: scarcitySpread(rows) };
    }),

  /** History for one tag, so the chart can show the index moving. */
  scarcityHistory: publicProcedure
    .input(z.object({ skillTag: z.string().max(32) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          multiplier: scarcitySnapshots.multiplier,
          openRequests: scarcitySnapshots.openRequests,
          activeGivers: scarcitySnapshots.activeGivers,
          computedAt: scarcitySnapshots.computedAt,
        })
        .from(scarcitySnapshots)
        .where(eq(scarcitySnapshots.skillTag, input.skillTag.toLowerCase()))
        .orderBy(desc(scarcitySnapshots.computedAt))
        .limit(30);
    }),

  recomputeScarcity: protectedProcedure.mutation(({ ctx }) =>
    recomputeScarcityIndex(ctx.db),
  ),
});
