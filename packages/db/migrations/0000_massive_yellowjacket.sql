CREATE TYPE "public"."build_type" AS ENUM('fyp', 'startup', 'hackathon', 'research');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('campus', 'skills', 'builds');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('idea', 'prototype', 'validated', 'incubated', 'launched');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('open', 'accepted', 'in_progress', 'fulfilled', 'verified', 'reopened', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('ask', 'give');--> statement-breakpoint
CREATE TYPE "public"."response_status" AS ENUM('proposed', 'accepted', 'declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'staff', 'admin', 'safety', 'mentor');--> statement-breakpoint
CREATE TABLE "build_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"build_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "build_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"build_id" uuid,
	"title" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "build_team_members" (
	"build_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text,
	CONSTRAINT "build_team_members_build_id_user_id_pk" PRIMARY KEY("build_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "build_type" NOT NULL,
	"department" text,
	"year" integer,
	"pipeline_stage" "pipeline_stage" DEFAULT 'idea' NOT NULL,
	"report_url" text,
	"repo_url" text,
	"demo_url" text,
	"cover_image_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contribution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"category" "category" NOT NULL,
	"points" integer NOT NULL,
	"post_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"user_id" uuid,
	"direction" "direction" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"actor_id" uuid,
	"from_status" text,
	"to_status" text,
	"note" text,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_upvotes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "post_upvotes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"type" "post_type" NOT NULL,
	"category" "category" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "post_status" DEFAULT 'open' NOT NULL,
	"credit_amount" numeric(10, 2),
	"location_name" text,
	"lat" double precision,
	"lng" double precision,
	"build_id" uuid,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"responder_id" uuid,
	"status" "response_status" DEFAULT 'proposed' NOT NULL,
	"message" text,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"reviewer_id" uuid,
	"reviewee_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scarcity_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_tag" text NOT NULL,
	"multiplier" numeric(4, 2) NOT NULL,
	"open_requests" integer NOT NULL,
	"active_givers" integer NOT NULL,
	"computed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" "role" DEFAULT 'student' NOT NULL,
	"department" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" numeric(10, 2) DEFAULT '2.00' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "build_comments" ADD CONSTRAINT "build_comments_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_comments" ADD CONSTRAINT "build_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_milestones" ADD CONSTRAINT "build_milestones_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_team_members" ADD CONSTRAINT "build_team_members_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_team_members" ADD CONSTRAINT "build_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_events" ADD CONSTRAINT "contribution_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_events" ADD CONSTRAINT "post_events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_events" ADD CONSTRAINT "post_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_upvotes" ADD CONSTRAINT "post_upvotes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_upvotes" ADD CONSTRAINT "post_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "build_comments_build_idx" ON "build_comments" USING btree ("build_id","created_at");--> statement-breakpoint
CREATE INDEX "build_milestones_build_idx" ON "build_milestones" USING btree ("build_id","created_at");--> statement-breakpoint
CREATE INDEX "builds_stage_idx" ON "builds" USING btree ("pipeline_stage");--> statement-breakpoint
CREATE INDEX "builds_dept_year_idx" ON "builds" USING btree ("department","year");--> statement-breakpoint
CREATE INDEX "contribution_events_user_category_idx" ON "contribution_events" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "ledger_user_idx" ON "ledger_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_post_idx" ON "ledger_entries" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_events_post_idx" ON "post_events" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_events_recent_idx" ON "post_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_category_status_idx" ON "posts" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_build_idx" ON "posts" USING btree ("build_id");--> statement-breakpoint
CREATE INDEX "posts_location_idx" ON "posts" USING btree ("category","location_name");--> statement-breakpoint
CREATE INDEX "responses_post_idx" ON "responses" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "responses_responder_idx" ON "responses" USING btree ("responder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_post_responder_uq" ON "responses" USING btree ("post_id","responder_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewee_idx" ON "reviews" USING btree ("reviewee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_post_reviewer_uq" ON "reviews" USING btree ("post_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "scarcity_tag_time_idx" ON "scarcity_snapshots" USING btree ("skill_tag","computed_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_department_idx" ON "users" USING btree ("department");