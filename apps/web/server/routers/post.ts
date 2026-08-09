// The one posts router. Campus, Skills and Builds all come through here —
// there is no per-category router, because there is no per-category backend
// (docs/PRD.md §9.1).

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  builds,
  notifyActivity,
  postEvents,
  postUpvotes,
  posts,
  responses,
  reviews,
  users,
  type Category,
} from "@buzz/db";
import {
  acceptResponseSchema,
  CONTRIBUTION_POINTS,
  computeSla,
  createPostSchema,
  explainRank,
  feedRankExpression,
  feedSchema,
  formatSlaRemaining,
  getMultiplierForTag,
  getPostHistory,
  nextStatuses,
  RECURRING_THRESHOLD,
  RECURRING_WINDOW_DAYS,
  recomputeScarcityIndex,
  redactAuthor,
  respondSchema,
  reviewSchema,
  slaHoursFor,
  transitionPost,
  transitionPostSchema,
  visiblePostsFilter,
  canSeePost,
  type ViewerContext,
} from "@buzz/core";
import { contributionEvents } from "@buzz/db";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import type { Context } from "../trpc";

/**
 * What the viewer has offered or asked about in Skills. Drives both the
 * Skills tag boost and the Builds teammate-discovery boost in the feed
 * ranking — the same tags do both jobs, which is exactly why no separate
 * cross-module mechanism is needed (docs/PRD.md Flow C).
 */
async function viewerContext(ctx: Context): Promise<ViewerContext> {
  if (!ctx.viewer) return {};

  const rows = await ctx.db
    .select({ tag: sql<string>`LOWER(${posts.metadata}->>'skillTag')` })
    .from(posts)
    .where(
      and(
        eq(posts.authorId, ctx.viewer.id),
        eq(posts.category, "skills"),
        sql`${posts.metadata}->>'skillTag' IS NOT NULL`,
      ),
    )
    .limit(40);

  return {
    userId: ctx.viewer.id,
    department: ctx.viewer.department,
    skillTags: [...new Set(rows.map((r) => r.tag).filter(Boolean))],
  };
}

function slaFor(post: {
  category: string;
  status: string;
  createdAt: Date | null;
  metadata: Record<string, unknown> | null;
}) {
  const sla = computeSla(post as never);
  if (!sla) return null;
  return {
    label: formatSlaRemaining(sla.msRemaining),
    severity: sla.severity,
    dueAt: sla.dueAt,
    hours: sla.hours,
    elapsedFraction: sla.elapsedFraction,
  };
}

export const postRouter = router({
  /**
   * THE feed. One query, all three categories, ranked by relevance and
   * degrading to pure recency for a viewer with no signals at all.
   */
  feed: publicProcedure.input(feedSchema).query(async ({ ctx, input }) => {
    const limit = input.limit ?? 20;
    const offset = input.cursor ?? 0;
    const viewer = await viewerContext(ctx);

    const conditions = [visiblePostsFilter(ctx.viewer)];

    if (input.category) conditions.push(eq(posts.category, input.category));
    if (input.type) conditions.push(eq(posts.type, input.type));
    if (input.status) conditions.push(eq(posts.status, input.status));
    if (input.skillTag) {
      conditions.push(
        sql`LOWER(${posts.metadata}->>'skillTag') = ${input.skillTag}`,
      );
    }
    if (input.search) {
      const term = `%${input.search}%`;
      conditions.push(
        or(ilike(posts.title, term), ilike(posts.description, term)),
      );
    }
    if (input.mine && ctx.viewer) {
      conditions.push(eq(posts.authorId, ctx.viewer.id));
    }
    if (input.assignedToMe && ctx.viewer) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${responses} r
          WHERE r.post_id = ${posts.id}
            AND r.responder_id = ${ctx.viewer.id}
            AND r.status IN ('proposed','accepted')
        )`,
      );
    }

    const rank = feedRankExpression(viewer);

    const orderBy =
      input.sort === "recent"
        ? [desc(posts.createdAt)]
        : input.sort === "urgent"
          ? [
              sql`(${posts.metadata}->>'urgency' = 'high') DESC NULLS LAST`,
              asc(posts.createdAt),
            ]
          : [desc(rank), desc(posts.createdAt)];

    const rows = await ctx.db
      .select({
        id: posts.id,
        type: posts.type,
        category: posts.category,
        title: posts.title,
        description: posts.description,
        status: posts.status,
        creditAmount: posts.creditAmount,
        locationName: posts.locationName,
        lat: posts.lat,
        lng: posts.lng,
        isAnonymous: posts.isAnonymous,
        metadata: posts.metadata,
        upvoteCount: posts.upvoteCount,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
        authorName: users.name,
        authorDepartment: users.department,
        buildTitle: builds.title,
        buildId: posts.buildId,
        responseCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${responses} r WHERE r.post_id = ${posts.id}
        )`,
        hasUpvoted: ctx.viewer
          ? sql<boolean>`EXISTS (
              SELECT 1 FROM ${postUpvotes} u
              WHERE u.post_id = ${posts.id} AND u.user_id = ${ctx.viewer.id}
            )`
          : sql<boolean>`FALSE`,
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.authorId))
      .leftJoin(builds, eq(builds.id, posts.buildId))
      .where(and(...conditions.filter(Boolean)))
      .orderBy(...orderBy)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => ({
        id: row.id,
        type: row.type,
        category: row.category,
        title: row.title,
        description: row.description,
        status: row.status,
        creditAmount: row.creditAmount,
        locationName: row.locationName,
        isAnonymous: row.isAnonymous,
        upvoteCount: row.upvoteCount,
        createdAt: row.createdAt,
        metadata: row.metadata as Record<string, unknown> | null,
        responseCount: Number(row.responseCount ?? 0),
        hasUpvoted: Boolean(row.hasUpvoted),
        buildTitle: row.buildTitle,
        buildId: row.buildId,
        author: redactAuthor(
          { isAnonymous: row.isAnonymous, authorId: row.authorId },
          row.authorId
            ? {
                id: row.authorId,
                name: row.authorName ?? "Unknown",
                department: row.authorDepartment,
              }
            : null,
          ctx.viewer,
        ),
        rankReason:
          input.sort === "recent"
            ? null
            : explainRank(
                {
                  category: row.category,
                  metadata: row.metadata as Record<string, unknown> | null,
                  authorId: row.authorId,
                  lat: row.lat,
                  lng: row.lng,
                },
                viewer,
              ),
        sla: slaFor({
          category: row.category,
          status: row.status,
          createdAt: row.createdAt,
          metadata: row.metadata as Record<string, unknown> | null,
        }),
      })),
      nextCursor: hasMore ? offset + limit : null,
    };
  }),

  /** Counts for the filter chips — one round trip, not four. */
  counts: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        category: posts.category,
        open: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} IN ('open','reopened'))::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(posts)
      .where(visiblePostsFilter(ctx.viewer))
      .groupBy(posts.category);

    const counts: Record<string, number> = { all: 0 };
    for (const row of rows) {
      counts[row.category] = Number(row.open ?? 0);
      counts.all = (counts.all ?? 0) + Number(row.open ?? 0);
    }
    return counts;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          post: posts,
          authorName: users.name,
          authorDepartment: users.department,
          buildTitle: builds.title,
        })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.authorId))
        .leftJoin(builds, eq(builds.id, posts.buildId))
        .where(eq(posts.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No such post" });

      // Enforced here, not in the page component — a sensitive report must
      // not leave the server for the wrong viewer at all.
      if (!canSeePost(row.post, ctx.viewer)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No such post",
        });
      }

      const [history, offers, existingReview] = await Promise.all([
        getPostHistory(input.id, ctx.db),
        ctx.db
          .select({
            id: responses.id,
            status: responses.status,
            message: responses.message,
            scheduledAt: responses.scheduledAt,
            createdAt: responses.createdAt,
            responderId: responses.responderId,
            responderName: users.name,
            responderDepartment: users.department,
          })
          .from(responses)
          .leftJoin(users, eq(users.id, responses.responderId))
          .where(eq(responses.postId, input.id))
          .orderBy(asc(responses.createdAt)),
        ctx.viewer
          ? ctx.db
              .select({ id: reviews.id })
              .from(reviews)
              .where(
                and(
                  eq(reviews.postId, input.id),
                  eq(reviews.reviewerId, ctx.viewer.id),
                ),
              )
              .limit(1)
          : Promise.resolve([]),
      ]);

      const actorIds = [...new Set(history.map((h) => h.actorId).filter(Boolean))];
      const actors = actorIds.length
        ? await ctx.db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, actorIds as string[]))
        : [];
      const actorNames = new Map(actors.map((a) => [a.id, a.name]));

      const [upvoted] = ctx.viewer
        ? await ctx.db
            .select({ postId: postUpvotes.postId })
            .from(postUpvotes)
            .where(
              and(
                eq(postUpvotes.postId, input.id),
                eq(postUpvotes.userId, ctx.viewer.id),
              ),
            )
        : [];

      return {
        ...row.post,
        buildTitle: row.buildTitle,
        author: redactAuthor(
          row.post,
          row.post.authorId
            ? {
                id: row.post.authorId,
                name: row.authorName ?? "Unknown",
                department: row.authorDepartment,
              }
            : null,
          ctx.viewer,
        ),
        history: history.map((event) => ({
          ...event,
          actorName: event.actorId
            ? (actorNames.get(event.actorId) ?? "Someone")
            : "Someone",
        })),
        responses: offers,
        sla: slaFor(row.post as never),
        hasUpvoted: Boolean(upvoted),
        hasReviewed: existingReview.length > 0,
        availableTransitions: nextStatuses(row.post.status),
        isAuthor: ctx.viewer?.id === row.post.authorId,
        viewerResponse:
          offers.find((o) => o.responderId === ctx.viewer?.id) ?? null,
      };
    }),

  /**
   * The one compose endpoint. Ask or Give, any category, same table, same
   * lifecycle — the category only decides which metadata keys get filled.
   */
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const metadata: Record<string, unknown> = {};

      if (input.category === "campus") {
        metadata.urgency = input.urgency ?? "medium";
        metadata.slaHours = slaHoursFor({ urgency: input.urgency ?? "medium" });
        if (input.photoUrl) metadata.photoUrl = input.photoUrl;
        if (input.issueType) metadata.issueType = input.issueType;
        if (ctx.viewer.department) metadata.department = ctx.viewer.department;
      }

      if (input.category === "skills" && input.skillTag) {
        metadata.skillTag = input.skillTag;
        if (input.durationMinutes) metadata.durationMinutes = input.durationMinutes;
        // Stamp the live multiplier at post time so the price a person
        // agreed to can't move under them later.
        metadata.scarcityMultiplier = await getMultiplierForTag(
          input.skillTag,
          ctx.db,
        );
      }

      if (input.category === "builds") {
        if (input.roleNeeded) metadata.roleNeeded = input.roleNeeded;
        if (input.requiredTags?.length) metadata.requiredTags = input.requiredTags;
        if (input.isMentorship) metadata.isMentorship = true;
      }

      const [created] = await ctx.db
        .insert(posts)
        .values({
          authorId: ctx.viewer.id,
          type: input.type,
          category: input.category,
          title: input.title,
          description: input.description ?? null,
          creditAmount:
            input.creditAmount != null ? input.creditAmount.toFixed(2) : null,
          locationName: input.locationName ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          buildId: input.buildId ?? null,
          isAnonymous: input.isAnonymous ?? false,
          metadata,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // The audit trail starts at creation, not at the first transition —
      // "who posted this and when" is part of the same history.
      await ctx.db.insert(postEvents).values({
        postId: created.id,
        actorId: ctx.viewer.id,
        fromStatus: null,
        toStatus: "open",
        note: null,
      });

      if (input.category === "skills") {
        // Supply and demand just moved; the index should reflect it.
        await recomputeScarcityIndex(ctx.db).catch(() => undefined);
      }

      await notifyActivity({
        kind: "post",
        postId: created.id,
        category: created.category,
        title: created.isAnonymous ? "A sensitive report was filed" : created.title,
      });

      return created;
    }),

  /** Offer to help. Doesn't change the post's status — the author decides. */
  respond: protectedProcedure
    .input(respondSchema)
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .select()
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!post || !canSeePost(post, ctx.viewer)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No such post" });
      }
      if (post.authorId === ctx.viewer.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't respond to your own post",
        });
      }
      if (!["open", "reopened"].includes(post.status)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This one isn't taking responses any more",
        });
      }

      const [created] = await ctx.db
        .insert(responses)
        .values({
          postId: input.postId,
          responderId: ctx.viewer.id,
          message: input.message ?? null,
          scheduledAt: input.scheduledAt ?? null,
        })
        .onConflictDoUpdate({
          target: [responses.postId, responses.responderId],
          set: { message: input.message ?? null, status: "proposed" },
        })
        .returning();

      await notifyActivity({
        kind: "event",
        postId: post.id,
        category: post.category,
        title: post.title,
      });

      return created;
    }),

  /**
   * Accept an offer. This is the moment credits get locked in escrow —
   * done by transitionPost, in the same transaction as the status change.
   */
  acceptResponse: protectedProcedure
    .input(acceptResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const [offer] = await ctx.db
        .select({ response: responses, post: posts })
        .from(responses)
        .innerJoin(posts, eq(posts.id, responses.postId))
        .where(eq(responses.id, input.responseId))
        .limit(1);

      if (!offer) throw new TRPCError({ code: "NOT_FOUND" });

      if (offer.post.authorId !== ctx.viewer.id && ctx.viewer.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the person who posted this can accept an offer",
        });
      }

      // One transaction: accepting the winning offer, declining the rest,
      // and moving the post all land together or not at all. Done
      // separately, a rejected transition would leave an accepted response
      // attached to a still-open post.
      const result = await ctx.db.transaction(async (tx) => {
        await tx
          .update(responses)
          .set({ status: "accepted" })
          .where(eq(responses.id, input.responseId));

        await tx
          .update(responses)
          .set({ status: "declined" })
          .where(
            and(
              eq(responses.postId, offer.post.id),
              eq(responses.status, "proposed"),
            ),
          );

        return transitionPost(
          {
            postId: offer.post.id,
            actor: ctx.viewer,
            toStatus: "accepted",
            counterpartyId: offer.response.responderId ?? undefined,
            note: "Offer accepted",
          },
          tx as never,
        );
      });

      await notifyActivity({
        kind: "event",
        postId: offer.post.id,
        category: offer.post.category,
        title: offer.post.title,
      });

      return result;
    }),

  /** Rule 4: the ONLY way a post's status changes anywhere in this app. */
  transition: protectedProcedure
    .input(transitionPostSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await transitionPost({
        postId: input.postId,
        actor: ctx.viewer,
        toStatus: input.toStatus,
        note: input.note,
        attachmentUrl: input.attachmentUrl,
        counterpartyId: input.counterpartyId,
      });

      if (result.post.category === "skills") {
        await recomputeScarcityIndex(ctx.db).catch(() => undefined);
      }

      await notifyActivity({
        kind: "event",
        postId: result.post.id,
        category: result.post.category,
        title: result.post.isAnonymous ? "A sensitive report moved" : result.post.title,
      });

      return result;
    }),

  upvote: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(postUpvotes)
          .where(
            and(
              eq(postUpvotes.postId, input.postId),
              eq(postUpvotes.userId, ctx.viewer.id),
            ),
          );

        if (existing) {
          await tx
            .delete(postUpvotes)
            .where(
              and(
                eq(postUpvotes.postId, input.postId),
                eq(postUpvotes.userId, ctx.viewer.id),
              ),
            );
          const [updated] = await tx
            .update(posts)
            .set({ upvoteCount: sql`GREATEST(${posts.upvoteCount} - 1, 0)` })
            .where(eq(posts.id, input.postId))
            .returning({ upvoteCount: posts.upvoteCount });
          return { upvoted: false, count: updated?.upvoteCount ?? 0 };
        }

        await tx
          .insert(postUpvotes)
          .values({ postId: input.postId, userId: ctx.viewer.id });
        const [updated] = await tx
          .update(posts)
          .set({ upvoteCount: sql`${posts.upvoteCount} + 1` })
          .where(eq(posts.id, input.postId))
          .returning({ upvoteCount: posts.upvoteCount });
        return { upvoted: true, count: updated?.upvoteCount ?? 0 };
      });
    }),

  review: protectedProcedure
    .input(reviewSchema)
    .mutation(async ({ ctx, input }) => {
      const [post] = await ctx.db
        .select()
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.status !== "verified") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Reviews open once the post is verified",
        });
      }
      if (input.revieweeId === ctx.viewer.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't review yourself",
        });
      }

      const [created] = await ctx.db
        .insert(reviews)
        .values({
          postId: input.postId,
          reviewerId: ctx.viewer.id,
          revieweeId: input.revieweeId,
          rating: input.rating,
          comment: input.comment ?? null,
        })
        .onConflictDoNothing()
        .returning();

      if (created) {
        await ctx.db.insert(contributionEvents).values({
          userId: ctx.viewer.id,
          category: post.category as Category,
          points: CONTRIBUTION_POINTS.review,
          postId: post.id,
        });
      }

      return created ?? null;
    }),

  /**
   * Recurring-issue detection (docs/PRD.md §6.1 #6): the same location
   * reporting the same kind of problem three or more times in 30 days is a
   * maintenance failure, not three unrelated reports.
   */
  recurringRisks: publicProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - RECURRING_WINDOW_DAYS * 86_400_000);

    const rows = await ctx.db
      .select({
        locationName: posts.locationName,
        issueType: sql<string>`COALESCE(${posts.metadata}->>'issueType', 'general')`,
        occurrences: sql<number>`COUNT(*)::int`,
        lastReportedAt: sql<Date>`MAX(${posts.createdAt})`,
        stillOpen: sql<number>`COUNT(*) FILTER (WHERE ${posts.status} IN ('open','reopened','accepted','in_progress'))::int`,
      })
      .from(posts)
      .where(
        and(
          eq(posts.category, "campus"),
          eq(posts.isAnonymous, false),
          gte(posts.createdAt, since),
          sql`${posts.locationName} IS NOT NULL`,
        ),
      )
      .groupBy(
        posts.locationName,
        sql`COALESCE(${posts.metadata}->>'issueType', 'general')`,
      )
      .having(sql`COUNT(*) >= ${RECURRING_THRESHOLD}`)
      .orderBy(sql`COUNT(*) DESC`);

    return rows.map((row) => ({
      ...row,
      occurrences: Number(row.occurrences),
      stillOpen: Number(row.stillOpen),
      windowDays: RECURRING_WINDOW_DAYS,
    }));
  }),
});
