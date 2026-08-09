// packages/db/schema.ts
//
// The single shared schema for the whole platform. Campus, Skills, and
// Builds all flow through `posts` — see docs/PRD.md Section 9.1 for the
// architectural rationale. Do not create parallel domain-specific tables
// (e.g. a separate `issues` or `skill_requests` table) — extend `metadata`
// instead, and add category-specific fields there.
//
// ── Deviations from the PRD Section 9.2 listing, and why ──────────────
//   * users.passwordHash — Auth.js credentials provider needs somewhere to
//     put the hash. Not a domain table, just auth plumbing.
//   * post_upvotes — posts.upvoteCount alone can't stop a user voting
//     twice. This is the membership table behind that counter, not a
//     parallel post entity.
//   * build_comments — PRD 6.3 #7 asks for comments on Build pages.
//   * indexes — feed ranking, the archive filters and the Trust dashboard
//     all read `posts` hard; these are the covering indexes for them.
// Everything else is byte-for-byte the schema in PRD Section 9.2.

import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── enums ──────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "student",
  "staff",
  "admin",
  "safety",
  "mentor",
]);

export const categoryEnum = pgEnum("category", ["campus", "skills", "builds"]);

export const postTypeEnum = pgEnum("post_type", ["ask", "give"]);

export const postStatusEnum = pgEnum("post_status", [
  "open",
  "accepted",
  "in_progress",
  "fulfilled",
  "verified",
  "reopened",
  "cancelled",
]);

export const responseStatusEnum = pgEnum("response_status", [
  "proposed",
  "accepted",
  "declined",
  "completed",
]);

export const ledgerDirectionEnum = pgEnum("direction", ["debit", "credit"]);

export const buildTypeEnum = pgEnum("build_type", [
  "fyp",
  "startup",
  "hackathon",
  "research",
]);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "idea",
  "prototype",
  "validated",
  "incubated",
  "launched",
]);

// ── core / shared ─────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    // Auth.js credentials provider — see the deviation note at the top.
    passwordHash: text("password_hash"),
    role: roleEnum("role").notNull().default("student"),
    department: text("department"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    roleIdx: index("users_role_idx").on(t.role),
    departmentIdx: index("users_department_idx").on(t.department),
  }),
);

export const wallets = pgTable("wallets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  balance: numeric("balance", { precision: 10, scale: 2 })
    .notNull()
    .default("2.00"),
});

export const contributionEvents = pgTable(
  "contribution_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    category: categoryEnum("category").notNull(),
    points: integer("points").notNull(),
    postId: uuid("post_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // The one Buzz Score is a sum over this table per user; the
    // "active in 2+ categories" metric groups by (user, category).
    userCategoryIdx: index("contribution_events_user_category_idx").on(
      t.userId,
      t.category,
    ),
  }),
);

// ── the one shared entity for everything ────────────────────────────────

export const builds = pgTable(
  "builds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    type: buildTypeEnum("type").notNull(),
    department: text("department"),
    year: integer("year"),
    pipelineStage: pipelineStageEnum("pipeline_stage").notNull().default("idea"),
    reportUrl: text("report_url"),
    repoUrl: text("repo_url"),
    demoUrl: text("demo_url"),
    coverImageUrl: text("cover_image_url"),
    // domain tags + tech stack for the searchable archive
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    stageIdx: index("builds_stage_idx").on(t.pipelineStage),
    deptYearIdx: index("builds_dept_year_idx").on(t.department, t.year),
  }),
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").references(() => users.id),
    type: postTypeEnum("type").notNull(),
    category: categoryEnum("category").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: postStatusEnum("status").notNull().default("open"),
    creditAmount: numeric("credit_amount", { precision: 10, scale: 2 }),
    locationName: text("location_name"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    buildId: uuid("build_id").references(() => builds.id), // set only when category = "builds"
    isAnonymous: boolean("is_anonymous").notNull().default(false), // campus sensitive-report mode
    // Category-specific extras live here, e.g.:
    //   campus: { urgency: "high", slaHours: 48 }
    //   skills: { skillTag: "react", scarcityMultiplier: 1.3 }
    //   builds: { roleNeeded: "backend", isMentorship: false }
    metadata: jsonb("metadata").$type<PostMetadata>(),
    upvoteCount: integer("upvote_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // The default feed: mixed categories, recency-ranked.
    feedIdx: index("posts_feed_idx").on(t.createdAt),
    categoryStatusIdx: index("posts_category_status_idx").on(
      t.category,
      t.status,
    ),
    authorIdx: index("posts_author_idx").on(t.authorId),
    buildIdx: index("posts_build_idx").on(t.buildId),
    // Recurring-issue detection: same location + category within 30 days.
    locationIdx: index("posts_location_idx").on(t.category, t.locationName),
  }),
);

export const postEvents = pgTable(
  "post_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id").references(() => posts.id),
    actorId: uuid("actor_id").references(() => users.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text("note"),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    postIdx: index("post_events_post_idx").on(t.postId, t.createdAt),
    // Powers the live-activity feed and the SSE polling fallback.
    recentIdx: index("post_events_recent_idx").on(t.createdAt),
  }),
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id").references(() => posts.id),
    responderId: uuid("responder_id").references(() => users.id),
    status: responseStatusEnum("status").notNull().default("proposed"),
    message: text("message"),
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    postIdx: index("responses_post_idx").on(t.postId),
    responderIdx: index("responses_responder_idx").on(t.responderId),
    onePerPerson: uniqueIndex("responses_post_responder_uq").on(
      t.postId,
      t.responderId,
    ),
  }),
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id").references(() => posts.id),
    userId: uuid("user_id").references(() => users.id),
    direction: ledgerDirectionEnum("direction").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason"), // e.g. "escrow_lock" | "escrow_release" | "starter_grant"
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("ledger_user_idx").on(t.userId, t.createdAt),
    postIdx: index("ledger_post_idx").on(t.postId),
  }),
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id").references(() => posts.id),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    revieweeId: uuid("reviewee_id").references(() => users.id),
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    revieweeIdx: index("reviews_reviewee_idx").on(t.revieweeId),
    oncePerPost: uniqueIndex("reviews_post_reviewer_uq").on(
      t.postId,
      t.reviewerId,
    ),
  }),
);

export const scarcitySnapshots = pgTable(
  "scarcity_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillTag: text("skill_tag").notNull(),
    multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull(),
    openRequests: integer("open_requests").notNull(),
    activeGivers: integer("active_givers").notNull(),
    computedAt: timestamp("computed_at").defaultNow(),
  },
  (t) => ({
    tagTimeIdx: index("scarcity_tag_time_idx").on(t.skillTag, t.computedAt),
  }),
);

export const buildTeamMembers = pgTable(
  "build_team_members",
  {
    buildId: uuid("build_id")
      .notNull()
      .references(() => builds.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.buildId, t.userId] }),
  }),
);

export const buildMilestones = pgTable(
  "build_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buildId: uuid("build_id").references(() => builds.id),
    title: text("title").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    buildIdx: index("build_milestones_build_idx").on(t.buildId, t.createdAt),
  }),
);

// ── supporting tables (see the deviation note at the top) ───────────────

export const postUpvotes = pgTable(
  "post_upvotes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.userId] }),
  }),
);

export const buildComments = pgTable(
  "build_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buildId: uuid("build_id")
      .notNull()
      .references(() => builds.id),
    authorId: uuid("author_id").references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    buildIdx: index("build_comments_build_idx").on(t.buildId, t.createdAt),
  }),
);

// ── relations ──────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  posts: many(posts),
  responses: many(responses),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  build: one(builds, { fields: [posts.buildId], references: [builds.id] }),
  events: many(postEvents),
  responses: many(responses),
}));

export const postEventsRelations = relations(postEvents, ({ one }) => ({
  post: one(posts, { fields: [postEvents.postId], references: [posts.id] }),
  actor: one(users, { fields: [postEvents.actorId], references: [users.id] }),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  post: one(posts, { fields: [responses.postId], references: [posts.id] }),
  responder: one(users, {
    fields: [responses.responderId],
    references: [users.id],
  }),
}));

export const buildsRelations = relations(builds, ({ many, one }) => ({
  team: many(buildTeamMembers),
  milestones: many(buildMilestones),
  comments: many(buildComments),
  openRoles: many(posts),
  createdBy: one(users, {
    fields: [builds.createdById],
    references: [users.id],
  }),
}));

export const buildTeamMembersRelations = relations(
  buildTeamMembers,
  ({ one }) => ({
    build: one(builds, {
      fields: [buildTeamMembers.buildId],
      references: [builds.id],
    }),
    user: one(users, {
      fields: [buildTeamMembers.userId],
      references: [users.id],
    }),
  }),
);

export const buildCommentsRelations = relations(buildComments, ({ one }) => ({
  build: one(builds, {
    fields: [buildComments.buildId],
    references: [builds.id],
  }),
  author: one(users, {
    fields: [buildComments.authorId],
    references: [users.id],
  }),
}));

// ── shared types ───────────────────────────────────────────────────────

export type Role = (typeof roleEnum.enumValues)[number];
export type Category = (typeof categoryEnum.enumValues)[number];
export type PostType = (typeof postTypeEnum.enumValues)[number];
export type PostStatus = (typeof postStatusEnum.enumValues)[number];
export type ResponseStatus = (typeof responseStatusEnum.enumValues)[number];
export type BuildType = (typeof buildTypeEnum.enumValues)[number];
export type PipelineStage = (typeof pipelineStageEnum.enumValues)[number];
export type LedgerDirection = (typeof ledgerDirectionEnum.enumValues)[number];

/**
 * The `metadata` JSONB column is the only thing that varies by category —
 * the lifecycle, audit trail and transition function are shared. Keep every
 * category-specific field in here rather than adding a column.
 */
export type PostMetadata = {
  // campus
  urgency?: "low" | "medium" | "high";
  slaHours?: number;
  photoUrl?: string;
  afterPhotoUrl?: string;
  issueType?: string;
  // skills
  skillTag?: string;
  durationMinutes?: number;
  scarcityMultiplier?: number;
  // builds
  roleNeeded?: string;
  requiredTags?: string[];
  isMentorship?: boolean;
  // shared
  [key: string]: unknown;
};

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostEvent = typeof postEvents.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type Build = typeof builds.$inferSelect;
export type BuildMilestone = typeof buildMilestones.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ScarcitySnapshot = typeof scarcitySnapshots.$inferSelect;
export type ContributionEvent = typeof contributionEvents.$inferSelect;
