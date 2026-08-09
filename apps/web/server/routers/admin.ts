// The unified admin console. Three category-scoped views into the SAME
// posts data — role-gated at the procedure level, not by hiding nav links
// (docs/PRD.md §6.4 #6, §11).

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  builds,
  ledgerEntries,
  postEvents,
  posts,
  users,
  wallets,
} from "@buzz/db";
import {
  CAMPUS_SLA_HOURS,
  PIPELINE_ORDER,
  RECURRING_THRESHOLD,
  RECURRING_WINDOW_DAYS,
  getCurrentScarcity,
  scarcitySpread,
} from "@buzz/core";
import { adminConsoleProcedure, adminProcedure, router } from "../trpc";

export const adminRouter = router({
  /** Campus console — SLA analytics, breaches, recurring-risk flags. */
  campus: adminConsoleProcedure("campus").query(async ({ ctx }) => {
    const queue = await ctx.db
      .select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        locationName: posts.locationName,
        createdAt: posts.createdAt,
        metadata: posts.metadata,
        isAnonymous: posts.isAnonymous,
        authorName: users.name,
        breached: sql<boolean>`
          ${posts.status} NOT IN ('verified','cancelled')
          AND NOW() > ${posts.createdAt}
              + (COALESCE((${posts.metadata}->>'slaHours')::int, 48) * INTERVAL '1 hour')
        `,
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.authorId))
      .where(
        and(
          eq(posts.category, "campus"),
          // A safety officer sees sensitive reports here; nobody else does.
          ctx.viewer.role === "safety" ? undefined : eq(posts.isAnonymous, false),
          sql`${posts.status} NOT IN ('verified','cancelled')`,
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(60);

    const byUrgency = await ctx.db
      .select({
        urgency: sql<string>`COALESCE(${posts.metadata}->>'urgency', 'medium')`,
        total: sql<number>`COUNT(*)::int`,
        resolved: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
        breached: sql<number>`
          COUNT(*) FILTER (
            WHERE ${posts.status} NOT IN ('verified','cancelled')
              AND NOW() > ${posts.createdAt}
                  + (COALESCE((${posts.metadata}->>'slaHours')::int, 48) * INTERVAL '1 hour')
          )::int
        `,
      })
      .from(posts)
      .where(and(eq(posts.category, "campus"), eq(posts.isAnonymous, false)))
      .groupBy(sql`COALESCE(${posts.metadata}->>'urgency', 'medium')`);

    const recurring = await ctx.db
      .select({
        locationName: posts.locationName,
        issueType: sql<string>`COALESCE(${posts.metadata}->>'issueType', 'general')`,
        occurrences: sql<number>`COUNT(*)::int`,
        stillOpen: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} NOT IN ('verified','cancelled'))::int`,
        lastReportedAt: sql<Date>`MAX(${posts.createdAt})`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.category, "campus"),
          eq(posts.isAnonymous, false),
          gte(
            posts.createdAt,
            new Date(Date.now() - RECURRING_WINDOW_DAYS * 86_400_000),
          ),
          sql`${posts.locationName} IS NOT NULL`,
        ),
      )
      .groupBy(
        posts.locationName,
        sql`COALESCE(${posts.metadata}->>'issueType', 'general')`,
      )
      .having(sql`COUNT(*) >= ${RECURRING_THRESHOLD}`)
      .orderBy(sql`COUNT(*) DESC`);

    return {
      queue,
      byUrgency,
      recurring,
      slaPolicy: CAMPUS_SLA_HOURS,
      window: RECURRING_WINDOW_DAYS,
      threshold: RECURRING_THRESHOLD,
    };
  }),

  /** Skills console — economy health. */
  skills: adminConsoleProcedure("skills").query(async ({ ctx }) => {
    const [supply] = await ctx.db
      .select({
        openAsks: sql<number>`COUNT(*) FILTER (WHERE ${posts.type} = 'ask' AND ${posts.status} IN ('open','reopened'))::int`,
        openGives: sql<number>`COUNT(*) FILTER (WHERE ${posts.type} = 'give' AND ${posts.status} IN ('open','reopened'))::int`,
        inFlight: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} IN ('accepted','in_progress','fulfilled'))::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} = 'verified')::int`,
      })
      .from(posts)
      .where(eq(posts.category, "skills"));

    const [money] = await ctx.db
      .select({
        inCirculation: sql<string>`COALESCE(SUM(${wallets.balance}), 0)::text`,
        wallets: sql<number>`COUNT(*)::int`,
        idle: sql<number>`COUNT(*) FILTER (WHERE ${wallets.balance}::numeric <= 2.00)::int`,
      })
      .from(wallets);

    const [escrow] = await ctx.db
      .select({
        held: sql<string>`
          COALESCE(SUM(
            CASE WHEN ${ledgerEntries.reason} = 'escrow_lock' THEN ${ledgerEntries.amount}
                 WHEN ${ledgerEntries.reason} IN ('escrow_release','escrow_refund') THEN -${ledgerEntries.amount}
                 ELSE 0 END
          ), 0)::text
        `,
      })
      .from(ledgerEntries);

    const scarcity = await getCurrentScarcity(ctx.db, 16);

    const velocity = await ctx.db
      .select({
        day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${ledgerEntries.createdAt}), 'YYYY-MM-DD')`,
        moved: sql<string>`COALESCE(SUM(${ledgerEntries.amount}) FILTER (WHERE ${ledgerEntries.reason} = 'escrow_release'), 0)::text`,
      })
      .from(ledgerEntries)
      .where(gte(ledgerEntries.createdAt, new Date(Date.now() - 30 * 86_400_000)))
      .groupBy(sql`DATE_TRUNC('day', ${ledgerEntries.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${ledgerEntries.createdAt})`);

    return {
      supply: {
        openAsks: Number(supply?.openAsks ?? 0),
        openGives: Number(supply?.openGives ?? 0),
        inFlight: Number(supply?.inFlight ?? 0),
        completed: Number(supply?.completed ?? 0),
      },
      money: {
        inCirculation: money?.inCirculation ?? "0.00",
        wallets: Number(money?.wallets ?? 0),
        idleWallets: Number(money?.idle ?? 0),
        inEscrow: escrow?.held ?? "0.00",
      },
      scarcity,
      spread: scarcitySpread(scarcity),
      velocity,
    };
  }),

  /** Builds console — pipeline funnel and promising projects. */
  builds: adminConsoleProcedure("builds").query(async ({ ctx }) => {
    const stages = await ctx.db
      .select({
        stage: builds.pipelineStage,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(builds)
      .groupBy(builds.pipelineStage);

    const stageCounts = new Map(stages.map((s) => [s.stage, Number(s.count)]));
    const total = [...stageCounts.values()].reduce((a, b) => a + b, 0);

    const funnel = PIPELINE_ORDER.map((stage, index) => {
      const reached = PIPELINE_ORDER.slice(index).reduce(
        (sum, s) => sum + (stageCounts.get(s) ?? 0),
        0,
      );
      return {
        stage,
        atStage: stageCounts.get(stage) ?? 0,
        reached,
        share: total === 0 ? 0 : Math.round((reached / total) * 100),
      };
    });

    // "Promising" is defined here rather than hand-flagged: a project that
    // is moving through the pipeline and drawing attention.
    const promising = await ctx.db
      .select({
        id: builds.id,
        title: builds.title,
        department: builds.department,
        pipelineStage: builds.pipelineStage,
        year: builds.year,
        stageMoves: sql<number>`(
          SELECT COUNT(*)::int FROM ${postEvents} e
          INNER JOIN ${posts} p ON p.id = e.post_id
          WHERE p.build_id = ${builds.id} AND p.metadata->>'kind' = 'stage_marker'
        )`,
        attention: sql<number>`(
          SELECT COALESCE(SUM(p.upvote_count), 0)::int FROM ${posts} p
          WHERE p.build_id = ${builds.id}
        )`,
        teamSize: sql<number>`(
          SELECT COUNT(*)::int FROM build_team_members m WHERE m.build_id = ${builds.id}
        )`,
      })
      .from(builds)
      .orderBy(desc(builds.createdAt))
      .limit(40);

    const stalled = await ctx.db
      .select({
        id: builds.id,
        title: builds.title,
        pipelineStage: builds.pipelineStage,
        createdAt: builds.createdAt,
        openRoles: sql<number>`(
          SELECT COUNT(*)::int FROM ${posts} p
          WHERE p.build_id = ${builds.id} AND p.status IN ('open','reopened')
        )`,
      })
      .from(builds)
      .where(
        and(
          eq(builds.pipelineStage, "idea"),
          sql`${builds.createdAt} < NOW() - INTERVAL '60 days'`,
        ),
      )
      .limit(12);

    return {
      total,
      funnel,
      promising: promising
        .map((p) => ({
          ...p,
          momentum:
            Number(p.stageMoves) * 3 +
            Number(p.attention) +
            Number(p.teamSize) * 2,
        }))
        .sort((a, b) => b.momentum - a.momentum)
        .slice(0, 10),
      stalled,
    };
  }),

  /** Role management — admin only, and never for the safety role by accident. */
  setRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["student", "staff", "admin", "safety", "mentor"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, name: users.name, role: users.role });
      return updated;
    }),

  people: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        balance: wallets.balance,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(wallets, eq(wallets.userId, users.id))
      .orderBy(desc(users.createdAt))
      .limit(100),
  ),
});
