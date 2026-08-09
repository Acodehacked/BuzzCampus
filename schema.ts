// packages/db/schema.ts
//
// The single shared schema for the whole platform. Campus, Skills, and
// Builds all flow through `posts` — see docs/PRD.md Section 9.1 for the
// architectural rationale. Do not create parallel domain-specific tables
// (e.g. a separate `issues` or `skill_requests` table) — extend `metadata`
// instead, and add category-specific fields there.

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

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("student"),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default("2.00"),
});

export const contributionEvents = pgTable("contribution_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  category: categoryEnum("category").notNull(),
  points: integer("points").notNull(),
  postId: uuid("post_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── the one shared entity for everything ────────────────────────────────

export const builds = pgTable("builds", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
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
  metadata: jsonb("metadata"),
  upvoteCount: integer("upvote_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postEvents = pgTable("post_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  actorId: uuid("actor_id").references(() => users.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const responses = pgTable("responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  responderId: uuid("responder_id").references(() => users.id),
  status: responseStatusEnum("status").notNull().default("proposed"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  userId: uuid("user_id").references(() => users.id),
  direction: ledgerDirectionEnum("direction").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"), // e.g. "escrow_lock" | "escrow_release" | "starter_grant"
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  revieweeId: uuid("reviewee_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scarcitySnapshots = pgTable("scarcity_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  skillTag: text("skill_tag").notNull(),
  multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull(),
  openRequests: integer("open_requests").notNull(),
  activeGivers: integer("active_givers").notNull(),
  computedAt: timestamp("computed_at").defaultNow(),
});

export const buildTeamMembers = pgTable("build_team_members", {
  buildId: uuid("build_id").references(() => builds.id),
  userId: uuid("user_id").references(() => users.id),
  role: text("role"),
});

export const buildMilestones = pgTable("build_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  buildId: uuid("build_id").references(() => builds.id),
  title: text("title").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});
