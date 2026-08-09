// Builds — the one category with a richer persistent entity, because a
// project outlives the posts attached to it (docs/PRD.md §9.2).
//
// Note what is NOT here: no separate "find a teammate" endpoint. An open
// role is an Ask with category=builds and a buildId — it goes into the same
// feed as everything else, and the shared ranking surfaces it to people
// whose Skills tags match. That's the whole mechanism.

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  buildComments,
  buildMilestones,
  buildTeamMembers,
  builds,
  contributionEvents,
  notifyActivity,
  postEvents,
  posts,
  users,
} from "@buzz/db";
import {
  advanceStageSchema,
  archiveQuerySchema,
  buildCommentSchema,
  CONTRIBUTION_POINTS,
  createBuildSchema,
  milestoneSchema,
  openRoleSchema,
  PIPELINE_ORDER,
  teamMemberSchema,
  updateBuildSchema,
} from "@buzz/core";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import type { Context } from "../trpc";

async function assertTeamMember(ctx: Context, buildId: string) {
  if (!ctx.viewer) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.viewer.role === "admin") return;

  const [member] = await ctx.db
    .select({ userId: buildTeamMembers.userId })
    .from(buildTeamMembers)
    .where(
      and(
        eq(buildTeamMembers.buildId, buildId),
        eq(buildTeamMembers.userId, ctx.viewer.id),
      ),
    );

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only this project's team can change it",
    });
  }
}

export const buildRouter = router({
  /** The public searchable archive — institutional memory, docs/PRD.md §6.3 #2. */
  archive: publicProcedure
    .input(archiveQuerySchema)
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 18;
      const offset = input.cursor ?? 0;
      const conditions = [];

      if (input.search) {
        const term = `%${input.search}%`;
        conditions.push(
          or(ilike(builds.title, term), ilike(builds.description, term)),
        );
      }
      if (input.department) conditions.push(eq(builds.department, input.department));
      if (input.year) conditions.push(eq(builds.year, input.year));
      if (input.type) conditions.push(eq(builds.type, input.type));
      if (input.stage) conditions.push(eq(builds.pipelineStage, input.stage));
      if (input.tag) {
        conditions.push(sql`${builds.tags} ? ${input.tag.toLowerCase()}`);
      }

      const rows = await ctx.db
        .select({
          id: builds.id,
          title: builds.title,
          description: builds.description,
          type: builds.type,
          department: builds.department,
          year: builds.year,
          pipelineStage: builds.pipelineStage,
          tags: builds.tags,
          repoUrl: builds.repoUrl,
          demoUrl: builds.demoUrl,
          coverImageUrl: builds.coverImageUrl,
          createdAt: builds.createdAt,
          teamSize: sql<number>`(
            SELECT COUNT(*)::int FROM ${buildTeamMembers} m WHERE m.build_id = ${builds.id}
          )`,
          openRoles: sql<number>`(
            SELECT COUNT(*)::int FROM ${posts} p
            WHERE p.build_id = ${builds.id} AND p.status IN ('open','reopened')
          )`,
        })
        .from(builds)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(builds.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = rows.length > limit;
      return {
        items: hasMore ? rows.slice(0, limit) : rows,
        nextCursor: hasMore ? offset + limit : null,
      };
    }),

  /** Distinct filter values, so the archive filters aren't hardcoded. */
  archiveFacets: publicProcedure.query(async ({ ctx }) => {
    const [departments, years, tags] = await Promise.all([
      ctx.db
        .selectDistinct({ value: builds.department })
        .from(builds)
        .where(sql`${builds.department} IS NOT NULL`),
      ctx.db
        .selectDistinct({ value: builds.year })
        .from(builds)
        .where(sql`${builds.year} IS NOT NULL`)
        .orderBy(desc(builds.year)),
      ctx.db
        .select({
          value: sql<string>`jsonb_array_elements_text(${builds.tags})`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(builds)
        .groupBy(sql`jsonb_array_elements_text(${builds.tags})`)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(24),
    ]);

    return {
      departments: departments.map((d) => d.value).filter(Boolean) as string[],
      years: years.map((y) => y.value).filter(Boolean) as number[],
      tags: tags.map((t) => ({ tag: t.value, count: Number(t.count) })),
    };
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [build] = await ctx.db
        .select()
        .from(builds)
        .where(eq(builds.id, input.id))
        .limit(1);

      if (!build) throw new TRPCError({ code: "NOT_FOUND", message: "No such project" });

      const [team, milestones, openRoles, comments, stageHistory] =
        await Promise.all([
          ctx.db
            .select({
              userId: buildTeamMembers.userId,
              role: buildTeamMembers.role,
              name: users.name,
              department: users.department,
            })
            .from(buildTeamMembers)
            .leftJoin(users, eq(users.id, buildTeamMembers.userId))
            .where(eq(buildTeamMembers.buildId, input.id)),
          ctx.db
            .select()
            .from(buildMilestones)
            .where(eq(buildMilestones.buildId, input.id))
            .orderBy(desc(buildMilestones.createdAt)),
          ctx.db
            .select({
              id: posts.id,
              title: posts.title,
              description: posts.description,
              status: posts.status,
              metadata: posts.metadata,
              creditAmount: posts.creditAmount,
              createdAt: posts.createdAt,
              responseCount: sql<number>`(
                SELECT COUNT(*)::int FROM responses r WHERE r.post_id = ${posts.id}
              )`,
            })
            .from(posts)
            .where(eq(posts.buildId, input.id))
            .orderBy(desc(posts.createdAt)),
          ctx.db
            .select({
              id: buildComments.id,
              body: buildComments.body,
              createdAt: buildComments.createdAt,
              authorId: buildComments.authorId,
              authorName: users.name,
            })
            .from(buildComments)
            .leftJoin(users, eq(users.id, buildComments.authorId))
            .where(eq(buildComments.buildId, input.id))
            .orderBy(asc(buildComments.createdAt)),
          // Pipeline stage history reuses postEvents via the Build's own
          // stage-marker post — see advanceStage below.
          ctx.db
            .select({
              fromStatus: postEvents.fromStatus,
              toStatus: postEvents.toStatus,
              note: postEvents.note,
              createdAt: postEvents.createdAt,
              actorName: users.name,
            })
            .from(postEvents)
            .innerJoin(posts, eq(posts.id, postEvents.postId))
            .leftJoin(users, eq(users.id, postEvents.actorId))
            .where(
              and(
                eq(posts.buildId, input.id),
                sql`${posts.metadata}->>'kind' = 'stage_marker'`,
              ),
            )
            .orderBy(asc(postEvents.createdAt)),
        ]);

      return {
        ...build,
        team,
        milestones,
        openRoles,
        comments,
        stageHistory,
        isTeamMember: Boolean(
          ctx.viewer &&
            team.some((member) => member.userId === ctx.viewer!.id),
        ),
      };
    }),

  create: protectedProcedure
    .input(createBuildSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [build] = await tx
          .insert(builds)
          .values({
            title: input.title,
            description: input.description ?? null,
            type: input.type,
            department: input.department ?? ctx.viewer.department ?? null,
            year: input.year ?? new Date().getFullYear(),
            tags: (input.tags ?? []).map((t) => t.toLowerCase()),
            reportUrl: input.reportUrl || null,
            repoUrl: input.repoUrl || null,
            demoUrl: input.demoUrl || null,
            coverImageUrl: input.coverImageUrl || null,
            createdById: ctx.viewer.id,
          })
          .returning();

        if (!build) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await tx.insert(buildTeamMembers).values({
          buildId: build.id,
          userId: ctx.viewer.id,
          role: "Lead",
        });

        // The stage-marker post: pipeline stage changes are recorded in the
        // same postEvents audit trail as every other lifecycle change on the
        // platform, rather than in a parallel build_stage_events table
        // (docs/BUILD_PLAN.md Phase 5 asks which pattern this repo uses —
        // it is this one).
        await tx.insert(posts).values({
          authorId: ctx.viewer.id,
          type: "give",
          category: "builds",
          title: `${build.title} — pipeline`,
          status: "in_progress",
          buildId: build.id,
          metadata: { kind: "stage_marker", stage: "idea" },
        });

        await notifyActivity({
          kind: "build",
          buildId: build.id,
          category: "builds",
          title: build.title,
        });

        return build;
      });
    }),

  update: protectedProcedure
    .input(updateBuildSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTeamMember(ctx, input.id);
      const { id, tags, ...rest } = input;

      const [updated] = await ctx.db
        .update(builds)
        .set({
          ...Object.fromEntries(
            Object.entries(rest).filter(([, value]) => value !== undefined),
          ),
          ...(tags ? { tags: tags.map((t) => t.toLowerCase()) } : {}),
        })
        .where(eq(builds.id, id))
        .returning();

      return updated;
    }),

  /**
   * Advance the pipeline. Writes to postEvents through the stage-marker
   * post, so a project moving Idea → Prototype leaves the same shape of
   * audit row as an AC repair moving Open → Accepted.
   */
  advanceStage: protectedProcedure
    .input(advanceStageSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTeamMember(ctx, input.buildId);

      return ctx.db.transaction(async (tx) => {
        const [build] = await tx
          .select()
          .from(builds)
          .where(eq(builds.id, input.buildId))
          .for("update");

        if (!build) throw new TRPCError({ code: "NOT_FOUND" });

        const currentIndex = PIPELINE_ORDER.indexOf(build.pipelineStage);
        const nextIndex = PIPELINE_ORDER.indexOf(input.stage);

        if (nextIndex === currentIndex) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Already at ${input.stage}`,
          });
        }
        if (nextIndex > currentIndex + 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project can't skip a pipeline stage",
          });
        }

        const [updated] = await tx
          .update(builds)
          .set({ pipelineStage: input.stage })
          .where(eq(builds.id, input.buildId))
          .returning();

        const [marker] = await tx
          .select({ id: posts.id })
          .from(posts)
          .where(
            and(
              eq(posts.buildId, input.buildId),
              sql`${posts.metadata}->>'kind' = 'stage_marker'`,
            ),
          )
          .limit(1);

        if (marker) {
          await tx.insert(postEvents).values({
            postId: marker.id,
            actorId: ctx.viewer.id,
            fromStatus: build.pipelineStage,
            toStatus: input.stage,
            note: input.note ?? null,
          });
          await tx
            .update(posts)
            .set({ metadata: { kind: "stage_marker", stage: input.stage } })
            .where(eq(posts.id, marker.id));
        }

        // Advancing a project is a contribution, same as any other.
        if (nextIndex > currentIndex) {
          const team = await tx
            .select({ userId: buildTeamMembers.userId })
            .from(buildTeamMembers)
            .where(eq(buildTeamMembers.buildId, input.buildId));

          if (team.length > 0) {
            await tx.insert(contributionEvents).values(
              team.map((member) => ({
                userId: member.userId,
                category: "builds" as const,
                points: CONTRIBUTION_POINTS.buildStageAdvance,
                postId: marker?.id ?? null,
              })),
            );
          }
        }

        await notifyActivity({
          kind: "build",
          buildId: build.id,
          category: "builds",
          title: `${build.title} → ${input.stage}`,
        });

        return updated;
      });
    }),

  addMilestone: protectedProcedure
    .input(milestoneSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTeamMember(ctx, input.buildId);
      const [created] = await ctx.db
        .insert(buildMilestones)
        .values({
          buildId: input.buildId,
          title: input.title,
          note: input.note ?? null,
        })
        .returning();
      return created;
    }),

  addTeamMember: protectedProcedure
    .input(teamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTeamMember(ctx, input.buildId);
      const [created] = await ctx.db
        .insert(buildTeamMembers)
        .values({
          buildId: input.buildId,
          userId: input.userId,
          role: input.role ?? "Contributor",
        })
        .onConflictDoUpdate({
          target: [buildTeamMembers.buildId, buildTeamMembers.userId],
          set: { role: input.role ?? "Contributor" },
        })
        .returning();
      return created;
    }),

  removeTeamMember: protectedProcedure
    .input(z.object({ buildId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertTeamMember(ctx, input.buildId);
      await ctx.db
        .delete(buildTeamMembers)
        .where(
          and(
            eq(buildTeamMembers.buildId, input.buildId),
            eq(buildTeamMembers.userId, input.userId),
          ),
        );
      return { ok: true };
    }),

  /**
   * Post an open role. Deliberately just creates an ordinary Ask — the feed
   * does the rest (docs/PRD.md §6.3 #5).
   */
  createOpenRole: protectedProcedure
    .input(openRoleSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTeamMember(ctx, input.buildId);

      const [build] = await ctx.db
        .select()
        .from(builds)
        .where(eq(builds.id, input.buildId))
        .limit(1);

      if (!build) throw new TRPCError({ code: "NOT_FOUND" });

      const [created] = await ctx.db
        .insert(posts)
        .values({
          authorId: ctx.viewer.id,
          type: "ask",
          category: "builds",
          title: `${build.title} needs ${input.roleNeeded}`,
          description: input.description ?? null,
          buildId: build.id,
          creditAmount:
            input.creditAmount != null ? input.creditAmount.toFixed(2) : null,
          metadata: {
            roleNeeded: input.roleNeeded,
            requiredTags: input.requiredTags.map((t) => t.toLowerCase()),
            isMentorship: input.isMentorship ?? false,
          },
        })
        .returning();

      if (created) {
        await ctx.db.insert(postEvents).values({
          postId: created.id,
          actorId: ctx.viewer.id,
          toStatus: "open",
        });
        await notifyActivity({
          kind: "post",
          postId: created.id,
          category: "builds",
          title: created.title,
        });
      }

      return created;
    }),

  /**
   * Who would be a good fit for this role. This is a *view* over the same
   * data the feed ranks on, not a separate matching engine — it answers
   * "who has offered these tags in Skills" and nothing more.
   */
  suggestTeammates: protectedProcedure
    .input(z.object({ tags: z.array(z.string()).min(1).max(6) }))
    .query(async ({ ctx, input }) => {
      const tags = input.tags.map((t) => t.toLowerCase());

      return ctx.db
        .select({
          userId: users.id,
          name: users.name,
          department: users.department,
          matchedTags: sql<string[]>`ARRAY_AGG(DISTINCT LOWER(${posts.metadata}->>'skillTag'))`,
          offers: sql<number>`COUNT(*)::int`,
          score: sql<number>`COALESCE((
            SELECT SUM(c.points)::int FROM ${contributionEvents} c WHERE c.user_id = ${users.id}
          ), 0)`,
        })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.authorId))
        .where(
          and(
            eq(posts.category, "skills"),
            eq(posts.type, "give"),
            sql`LOWER(${posts.metadata}->>'skillTag') = ANY(ARRAY[${sql.join(
              tags.map((tag) => sql`${tag}`),
              sql`, `,
            )}]::text[])`,
          ),
        )
        .groupBy(users.id, users.name, users.department)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(8);
    }),

  comment: protectedProcedure
    .input(buildCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(buildComments)
        .values({
          buildId: input.buildId,
          authorId: ctx.viewer.id,
          body: input.body,
        })
        .returning();
      return created;
    }),

  /** Someone to add to a team — search by name or email. */
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(2).max(60) }))
    .query(async ({ ctx, input }) => {
      const term = `%${input.query}%`;
      return ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          department: users.department,
        })
        .from(users)
        .where(or(ilike(users.name, term), ilike(users.email, term)))
        .limit(8);
    }),

  /** The projects this user is on — for the profile page. */
  byUser: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const memberships = await ctx.db
        .select({ buildId: buildTeamMembers.buildId, role: buildTeamMembers.role })
        .from(buildTeamMembers)
        .where(eq(buildTeamMembers.userId, input.userId));

      if (memberships.length === 0) return [];

      const rows = await ctx.db
        .select()
        .from(builds)
        .where(inArray(builds.id, memberships.map((m) => m.buildId)));

      const roles = new Map(memberships.map((m) => [m.buildId, m.role]));
      return rows.map((build) => ({ ...build, memberRole: roles.get(build.id) }));
    }),
});
