// The public Trust dashboard — the judge-facing centrepiece
// (docs/PRD.md §6.1 #5). Public on purpose: transparency by default,
// privacy by exception. Sensitive Campus reports are excluded everywhere
// in here, at the query layer.

import { and, eq, gte, sql } from "drizzle-orm";
import {
  builds,
  contributionEvents,
  ledgerEntries,
  postEvents,
  posts,
} from "@buzz/db";
import {
  crossCategoryAdoption,
  getCurrentScarcity,
  PIPELINE_ORDER,
  scarcitySpread,
} from "@buzz/core";
import { publicProcedure, router } from "../trpc";

const DAY = 86_400_000;

export const trustRouter = router({
  /** Campus tab — resolution rate, average time, category breakdown. */
  campus: publicProcedure.query(async ({ ctx }) => {
    const [headline] = await ctx.db
      .select({
        total: sql<number>`COUNT(*)::int`,
        resolved: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
        open: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} IN ('open','reopened'))::int`,
        inFlight: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} IN ('accepted','in_progress','fulfilled'))::int`,
      })
      .from(posts)
      .where(and(eq(posts.category, "campus"), eq(posts.isAnonymous, false)));

    // Time to resolution, measured from the post to its verifying event.
    const [timing] = await ctx.db
      .select({
        avgHours: sql<string>`
          COALESCE(AVG(EXTRACT(EPOCH FROM (${postEvents.createdAt} - ${posts.createdAt})) / 3600), 0)::numeric(10,1)::text
        `,
        medianHours: sql<string>`
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (${postEvents.createdAt} - ${posts.createdAt})) / 3600
          ), 0)::numeric(10,1)::text
        `,
      })
      .from(postEvents)
      .innerJoin(posts, eq(posts.id, postEvents.postId))
      .where(
        and(
          eq(posts.category, "campus"),
          eq(posts.isAnonymous, false),
          eq(postEvents.toStatus, "verified"),
        ),
      );

    // Within-SLA share: resolved before createdAt + metadata.slaHours.
    const [sla] = await ctx.db
      .select({
        withinSla: sql<number>`
          COUNT(*) FILTER (
            WHERE ${postEvents.createdAt} <= ${posts.createdAt}
              + (COALESCE((${posts.metadata}->>'slaHours')::int, 48) * INTERVAL '1 hour')
          )::int
        `,
        measured: sql<number>`COUNT(*)::int`,
      })
      .from(postEvents)
      .innerJoin(posts, eq(posts.id, postEvents.postId))
      .where(
        and(
          eq(posts.category, "campus"),
          eq(posts.isAnonymous, false),
          eq(postEvents.toStatus, "verified"),
        ),
      );

    const byType = await ctx.db
      .select({
        issueType: sql<string>`COALESCE(${posts.metadata}->>'issueType', 'Other')`,
        total: sql<number>`COUNT(*)::int`,
        resolved: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
      })
      .from(posts)
      .where(and(eq(posts.category, "campus"), eq(posts.isAnonymous, false)))
      .groupBy(sql`COALESCE(${posts.metadata}->>'issueType', 'Other')`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(8);

    const trend = await ctx.db
      .select({
        day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${posts.createdAt}), 'YYYY-MM-DD')`,
        reported: sql<number>`COUNT(*)::int`,
        resolved: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.category, "campus"),
          eq(posts.isAnonymous, false),
          gte(posts.createdAt, new Date(Date.now() - 30 * DAY)),
        ),
      )
      .groupBy(sql`DATE_TRUNC('day', ${posts.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${posts.createdAt})`);

    const total = Number(headline?.total ?? 0);
    const resolved = Number(headline?.resolved ?? 0);
    const measured = Number(sla?.measured ?? 0);

    return {
      total,
      resolved,
      open: Number(headline?.open ?? 0),
      inFlight: Number(headline?.inFlight ?? 0),
      resolutionRate: total === 0 ? 0 : Math.round((resolved / total) * 100),
      avgHours: Number(timing?.avgHours ?? 0),
      medianHours: Number(timing?.medianHours ?? 0),
      slaComplianceRate:
        measured === 0
          ? 0
          : Math.round((Number(sla?.withinSla ?? 0) / measured) * 100),
      byType,
      trend,
    };
  }),

  /** Skills tab — the credit economy's health. */
  skills: publicProcedure.query(async ({ ctx }) => {
    const [headline] = await ctx.db
      .select({
        asks: sql<number>`COUNT(*) FILTER (WHERE ${posts.type} = 'ask')::int`,
        gives: sql<number>`COUNT(*) FILTER (WHERE ${posts.type} = 'give')::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
      })
      .from(posts)
      .where(eq(posts.category, "skills"));

    const [velocity] = await ctx.db
      .select({
        moved: sql<string>`COALESCE(SUM(${ledgerEntries.amount}) FILTER (WHERE ${ledgerEntries.reason} = 'escrow_release'), 0)::text`,
        transfers: sql<number>`COUNT(*) FILTER (WHERE ${ledgerEntries.reason} = 'escrow_release')::int`,
        granted: sql<string>`COALESCE(SUM(${ledgerEntries.amount}) FILTER (WHERE ${ledgerEntries.reason} = 'starter_grant'), 0)::text`,
      })
      .from(ledgerEntries);

    const scarcity = await getCurrentScarcity(ctx.db, 10);

    const topTags = await ctx.db
      .select({
        tag: sql<string>`LOWER(${posts.metadata}->>'skillTag')`,
        asks: sql<number>`COUNT(*) FILTER (WHERE ${posts.type} = 'ask')::int`,
        gives: sql<number>`COUNT(*) FILTER (WHERE ${posts.type} = 'give')::int`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.category, "skills"),
          sql`${posts.metadata}->>'skillTag' IS NOT NULL`,
        ),
      )
      .groupBy(sql`LOWER(${posts.metadata}->>'skillTag')`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return {
      asks: Number(headline?.asks ?? 0),
      gives: Number(headline?.gives ?? 0),
      completed: Number(headline?.completed ?? 0),
      creditsMoved: velocity?.moved ?? "0.00",
      transfers: Number(velocity?.transfers ?? 0),
      creditsGranted: velocity?.granted ?? "0.00",
      scarcity,
      scarcitySpread: scarcitySpread(scarcity),
      topTags,
    };
  }),

  /** Builds tab — the pipeline funnel. */
  builds: publicProcedure.query(async ({ ctx }) => {
    const stages = await ctx.db
      .select({
        stage: builds.pipelineStage,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(builds)
      .groupBy(builds.pipelineStage);

    const stageCounts = new Map(stages.map((s) => [s.stage, Number(s.count)]));
    const total = [...stageCounts.values()].reduce((a, b) => a + b, 0);

    // A funnel is cumulative: everything at "incubated" also passed
    // "prototype", so each step counts everything at or beyond it.
    const funnel = PIPELINE_ORDER.map((stage, index) => {
      const atOrBeyond = PIPELINE_ORDER.slice(index).reduce(
        (sum, s) => sum + (stageCounts.get(s) ?? 0),
        0,
      );
      return {
        stage,
        atStage: stageCounts.get(stage) ?? 0,
        reached: atOrBeyond,
        share: total === 0 ? 0 : Math.round((atOrBeyond / total) * 100),
      };
    });

    const [roles] = await ctx.db
      .select({
        open: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} IN ('open','reopened'))::int`,
        filled: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.category, "builds"),
          sql`${posts.metadata}->>'roleNeeded' IS NOT NULL`,
        ),
      );

    const byDepartment = await ctx.db
      .select({
        department: sql<string>`COALESCE(${builds.department}, 'Unassigned')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(builds)
      .groupBy(sql`COALESCE(${builds.department}, 'Unassigned')`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(8);

    return {
      total,
      funnel,
      openRoles: Number(roles?.open ?? 0),
      rolesFilled: Number(roles?.filled ?? 0),
      byDepartment,
    };
  }),

  /**
   * The platform headline. §12: the share of people active in two or more
   * categories is the number that proves the one-feed model works.
   */
  platform: publicProcedure.query(async ({ ctx }) => {
    const [adoption, totals, activity] = await Promise.all([
      crossCategoryAdoption(ctx.db),
      ctx.db
        .select({
          category: posts.category,
          total: sql<number>`COUNT(*)::int`,
          verified: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
        })
        .from(posts)
        .where(eq(posts.isAnonymous, false))
        .groupBy(posts.category),
      ctx.db
        .select({
          day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${contributionEvents.createdAt}), 'YYYY-MM-DD')`,
          campus: sql<number>`COUNT(*) FILTER (WHERE ${contributionEvents.category} = 'campus')::int`,
          skills: sql<number>`COUNT(*) FILTER (WHERE ${contributionEvents.category} = 'skills')::int`,
          builds: sql<number>`COUNT(*) FILTER (WHERE ${contributionEvents.category} = 'builds')::int`,
        })
        .from(contributionEvents)
        .where(gte(contributionEvents.createdAt, new Date(Date.now() - 30 * DAY)))
        .groupBy(sql`DATE_TRUNC('day', ${contributionEvents.createdAt})`)
        .orderBy(sql`DATE_TRUNC('day', ${contributionEvents.createdAt})`),
    ]);

    return { adoption, totals, activity };
  }),
});
