# Buzz
### One Feed. Ask for Help, Give a Hand.
**Product Requirements Document & Build Plan — Full-Stack Web App Building Competition**

---

## 0. The One-Liner

> **Buzz is a single campus feed where every need and every offer to help — a broken AC, an hour of tutoring, a missing teammate for a startup — is the same kind of post: an Ask or a Give.** One home screen, one "+ Post" button, one wallet, one reputation score. Three everyday campus problems, one habit.

---

## 1. Problem Statement

Three real, independently-validated campus problems sit underneath Buzz — but the platform is deliberately not three separate tools for them.

### 1.1 Campus — facilities & operations
Complaints about broken infrastructure vanish into WhatsApp/verbal reports with no tracking, no SLA, and no way to know if anyone's even seen it — so students stop reporting, and the institution loses visibility into real problems.

### 1.2 Skills — peer knowledge exchange
Enormous peer expertise sits untapped because there's no efficient, non-awkward, non-monetary way to trade help — a design senior good at Figma, a hostel-mate who can actually explain thermodynamics — while paid tutoring is exclusionary and asking a favor creates an untracked social debt.

### 1.3 Builds — the missing institutional memory
Every year, hundreds of final-year projects and startup ideas get built, presented once, and then disappear — buried in a submitted PDF nobody can find again, with no searchable archive, no visibility for the incubation cell, and no structured way for a project team to find a teammate with a missing skill.

### 1.4 The Real Problem: Fragmentation Itself
Even where individual tools exist for each of these, **they don't talk to each other and don't build a persistent record of what a student has contributed.** And critically: a tool built as three separate destinations only ever gets used by the subset of people who specifically decide to visit each one. A student who only ever has facility complaints has no reason to ever open a "skills" tab — so most people only ever touch one-third of the platform, which defeats the entire point of building it as one thing.

---

## 2. The Core Model: Ask & Give

Instead of three modules, Buzz has **one interaction pattern, applied to three categories.**

Every single thing on the platform is either someone asking for help or someone giving it:

| Real-world need | Post type | Category |
|---|---|---|
| "The AC in Block C is broken" | **Ask** | `Campus` |
| "I can teach React in an hour" | **Give** | `Skills` |
| "I need help with calculus" | **Ask** | `Skills` |
| "EcoTrack needs a backend developer" | **Ask** | `Builds` (linked to a project page) |
| "Here's our finished FYP, browse it" | *(a Build page, not a post)* | `Builds` |

One compose flow handles all of it:

```
[+ Post] → "What do you need, or what can you give?"
   ↓
  Ask ("I need...")              Give ("I can...")
   ↓                               ↓
  pick a category: Campus / Skills / Builds
   ↓
  fill in the 3–4 fields relevant to that category
   ↓
  appears in the shared feed, filterable by category
```

Every post — regardless of category — moves through the same lifecycle: `Open → Accepted → In Progress → Fulfilled → Verified` (with `Reopened` if the fulfillment wasn't good enough), with an immutable, timestamped event history. This is one shared mechanism, not three parallel ones dressed the same.

---

## 3. Why One Feed Drives Actual Universal Adoption

- **One home screen, not three.** `/feed` mixes all three categories by default, ranked by relevance (proximity for Campus, matching skill tags for Skills, department/interest match for Builds) and recency. A student who opens the app only to report a broken tap still scrolls past a tutoring request and a project opening in the same session — cross-category exposure happens by default, without a second deliberate decision to "go check the other module."
- **One currency, one score.** Credits earned resolving a Campus issue, teaching a Skills session, or hitting a Builds milestone land in the same wallet and the same **Buzz Score** — so there's no such thing as "I only participate in Fix." Earning anywhere and having nowhere obvious to spend except trying a different category is a genuine nudge toward cross-category use.
- **One "+" button.** No separate "report an issue" vs. "list a skill" vs. "start a project" entry points competing for attention — one action, a short category picker, done.
- **A concrete, demoable adoption story.** Show the feed mixing all three categories in one scroll, post an Ask, watch it appear next to unrelated categories immediately, resolve one from a category the person didn't open the app for. That's a stronger live demo than three separate module walkthroughs — and it's the actual mechanism, not a claim.

---

## 4. Target Users & Personas

| Persona | What they do on Buzz |
|---|---|
| **Any Student** | The default user — posts Asks/Gives across whichever category is relevant that day, builds one Buzz Score over time |
| **Facility Staff / Warden** | Responds to `Campus` Asks in their queue, moves them through the lifecycle |
| **Faculty / Alumni Mentor** | Responds to `Builds` Asks tagged as mentorship requests |
| **Incubation Officer / Department Admin** | Views the admin console across all three categories — SLA compliance, skill-economy health, project pipeline |
| **Prospective Student / Parent / Judge** | Views the public Trust dashboard — proof the campus actually works |

---

## 5. Product Pillars

1. **One interaction pattern, everywhere.** Every entity on the platform is a post with a lifecycle and an audit trail — never a bespoke form for a specific domain.
2. **Contribution is one thing, not three.** A single Buzz Score and a single wallet mean helping is helping, regardless of category.
3. **Nothing gets lost.** Builds is explicit institutional memory — projects stay searchable and referenceable long after their team graduates.
4. **Transparency by default, privacy by exception.** The Trust dashboard, the skill marketplace, and the project archive are all open by default — sensitive Campus reports are the one deliberate, restricted exception.
5. **The feed is the product.** Nearly everything else (category pages, project pages, profiles) exists to be discovered *from* the feed, not as a separate destination competing with it.

---

## 6. Feature Set

### 6.1 Category: Campus

| # | Feature | Notes |
|---|---|---|
| 1 | Post an Ask (photo, map pin, urgency, category `Campus`) | Core loop |
| 2 | Lifecycle with immutable event log, SLA countdown per issue type | Shared `posts`/`postEvents` mechanism |
| 3 | Staff queue (filtered feed view: `Campus`, assigned to their department) | Staff-side, same underlying data as the public feed |
| 4 | Verify & close with before/after photo | Trust mechanism |
| 5 | Public Trust dashboard — resolution rate, avg time, category breakdown | Judge-facing centerpiece |
| 6 | Recurring-issue detection (same location/type ≥3x in 30 days → flagged) | The "smart" feature |
| 7 | Anonymous/sensitive Ask mode, restricted to a Safety Officer role | Real unmet need |
| *Stretch* | Resource booking, auto-escalation on SLA breach, heatmap layer | |

### 6.2 Category: Skills

| # | Feature | Notes |
|---|---|---|
| 1 | Post a Give (list a skill) or an Ask (request help) | Two-directional, same table |
| 2 | Starter credit grant on signup | Solves cold start |
| 3 | Accept → **credit escrow lock** → dual confirmation → release | The trust mechanism |
| 4 | Wallet: balance + full ledger history (shared across all categories, Section 7) | Transparency |
| 5 | **Scarcity Index** — live per-category credit multiplier based on supply/demand | Technical/visual centerpiece |
| 6 | Ratings + reviews, contributing to the unified Buzz Score | Reputation |
| *Stretch* | Group workshops, guilds | |

### 6.3 Category: Builds

| # | Feature | Notes |
|---|---|---|
| 1 | Build page: title, description, type (FYP/startup/hackathon/research), domain tags, department/year, report PDF, repo/demo links, cover image, team | The "uploads library" core |
| 2 | Searchable/filterable archive — department, year, domain, tech stack, pipeline stage | Solves the institutional-memory problem |
| 3 | Pipeline: `Idea → Prototype → Validated → Incubated → Launched`, immutable stage-event history | Same shared lifecycle pattern as every other post |
| 4 | Open roles with required skill tags → posted as `Ask`, category `Builds`, linked to the Build | Sets up teammate discovery |
| 5 | **Teammate discovery is just the feed.** An open role appears in the same shared feed as everything else, matched to students whose Skills posts list that tag | No separate "cross-module" mechanism needed — it's the same feed doing its job |
| 6 | Progress log / milestone updates | Cheap, high perceived value |
| 7 | Public upvotes + comments | Community engagement |
| 8 | Mentorship requests — posted as an `Ask`, category `Builds`, `metadata.type = mentorship`, optionally credit-free | Routed through the exact same accept/fulfill flow as anything else |
| *Stretch* | Incubation officer dashboard (pipeline funnel), "similar past projects" suggestions, exportable project portfolio PDF | |

### 6.4 Shared Platform Features

| # | Feature | Notes |
|---|---|---|
| 1 | Single auth + unified profile | Foundation |
| 2 | **One feed** (`/feed`), filterable by category, ranked by relevance | The platform's home screen and core habit loop |
| 3 | **One wallet, one ledger** across all categories | Section 3 |
| 4 | **One Buzz Score**, derived from `contributionEvents` across all categories | The platform's identity feature |
| 5 | Unified notification center + a mixed "daily digest" (one item per category, when relevant) | Drives return visits without requiring a specific reason |
| 6 | Unified admin console (role/category-scoped views into the same underlying `posts` data) | Institutional adoption story |
| 7 | Verified Contributions export (PDF) — issues fixed, hours taught, projects shipped, one signed document | Résumé/placement value |

---

## 7. Information Architecture

```
├── /feed ........................... Home screen — mixed feed, filter chips (All/Campus/Skills/Builds)
├── /post/new ........................ Single compose flow: Ask or Give → category → fields
├── /posts/[id] ....................... Detail: status, event history, responses, "I can help"
├── /builds/[id] ...................... Project page: pipeline, team, milestones, uploaded assets
├── /builds/[id]/team ................. Manage team + open roles
├── /profile/[id] ..................... Buzz Score, wallet, posts history — one profile
├── /wallet ............................ Ledger + Scarcity Index charts, spans all categories
├── /trust ............................. Public dashboard — tabbed: Campus SLA / Skills economy / Builds pipeline
├── /login /register
└── /admin
    ├── /admin/campus ................. SLA analytics, categories, recurring-risk flags
    ├── /admin/skills .................. Economy health dashboard
    └── /admin/builds ................... Pipeline funnel, flagged promising projects
```

Nine core screens (plus admin) — a small, coherent surface for what used to be roughly fifteen module-specific pages, with no functionality actually removed.

---

## 8. Core User Flows

**Flow A — Post an Ask, get it fulfilled (works identically for all three categories)**
`/feed` → `+ Post` → "Ask" → pick a category → fill in the relevant fields (photo+location for Campus, skill+duration for Skills, role+tags for Builds) → post appears in the shared feed → someone responds → accept → (if Skills/Builds with credits) escrow locks → work happens → both sides confirm → post moves to `Verified`, `contributionEvents` written for both people, credits release if applicable.

**Flow B — Discover something you didn't come looking for**
A student opens `/feed` specifically to check on their Campus Ask from yesterday → scrolls past a Skills Give ("Aisha can teach React, 1.3x credits") and a Builds Ask ("EcoTrack needs an Arduino person") they weren't looking for → this incidental exposure, happening by default on the one screen everyone already opens, is the actual mechanism that gets people using categories they didn't sign up for.

**Flow C — Teammate discovery via the shared feed (no separate mechanism)**
A Builds team adds an open role tagged `embedded-systems` on their project page → this creates an `Ask`, category `Builds`, visible in the main feed to anyone whose Skills profile lists that tag, and surfaced to them specifically in their personalized ranking → they respond through the exact same accept/fulfill flow as any tutoring session.

**Flow D — A day spanning all three categories (the adoption proof)**
Morning: checks `/feed` for a reply to her Skills Ask (calculus help), notices a Campus Ask (jammed printer) and a Builds Ask (Arduino help) in the same scroll. Afternoon: walks past the jammed printer, taps the Campus Ask, fixes it, marks it resolved — no "switching modules," just the next card in her feed. Evening: her calculus tutor turns out to be on the EcoTrack Build she scrolled past that morning. One person, one sitting, three categories, zero deliberate "let me go check the other section" moments.

---

## 9. Technical Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router, RSC) — Nx monorepo                     │
│  apps/web (the Buzz app)                                          │
│  packages/db (Drizzle schema + migrations — one shared model)    │
│  packages/ui (shared design system components — Section 11)      │
│  packages/core (shared lifecycle + credit-transfer utilities,     │
│    consumed by every category, not domain-specific)               │
├───────────────────────────────────────────────────────────────┤
│  Auth.js (NextAuth) — campus email restriction, RBAC across        │
│  student / staff / admin / safety-officer / mentor roles           │
├───────────────────────────────────────────────────────────────┤
│  Drizzle ORM ────────────► PostgreSQL (Neon)                        │
│  + PostGIS (Campus geo-queries)                                     │
├───────────────────────────────────────────────────────────────┤
│  Realtime: Postgres LISTEN/NOTIFY → SSE (feed updates, wallet,      │
│    pipeline changes)                                                 │
│  Storage: Vercel Blob / S3 — issue photos, project reports/media     │
│  Charts: Recharts — Trust dashboard, Scarcity Index, pipeline funnel │
│  Validation: Zod, shared schemas in packages/core                    │
└───────────────────────────────────────────────────────────────┘
Deploy: Vercel + Neon
```

An **Nx monorepo** is the right structural choice here and worth calling out explicitly in any technical write-up: `packages/db`, `packages/core`, and `packages/ui` are consumed identically by all three categories — there is no per-category backend, just per-category `metadata` shape and UI treatment on top of one shared foundation.

### 9.1 The Shared Lifecycle Pattern

```ts
// packages/core/lifecycle.ts — used by every category, no exceptions
async function transitionPost(
  postId: string, actorId: string, toStatus: PostStatus, note?: string
) {
  // 1. read current status  2. write a postEvents row  3. update posts.status
  // — one DB transaction, identical logic regardless of category
}
```

There is one `posts` table and one `postEvents` table for the whole platform. `category` (`campus | skills | builds`) and a `metadata` JSONB column carry whatever's category-specific (skill tags, urgency, required role) — the lifecycle, the audit trail, and the transition function are shared, not reimplemented per domain. This is the concrete, database-level answer to "why is this one platform and not three."

### 9.2 Full Drizzle Schema

```ts
// ── core / shared ──
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: pgEnum("role", ["student", "staff", "admin", "safety", "mentor"])("role").default("student"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  balance: numeric("balance", { precision: 10, scale: 2 }).default("2.00"),   // starter credits
});

export const contributionEvents = pgTable("contribution_events", {   // powers the one Buzz Score
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  category: pgEnum("category", ["campus", "skills", "builds"])("category").notNull(),
  points: integer("points").notNull(),
  postId: uuid("post_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── the one shared entity for everything ──
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").references(() => users.id),
  type: pgEnum("post_type", ["ask", "give"])("type").notNull(),
  category: pgEnum("category", ["campus", "skills", "builds"])("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: pgEnum("post_status", [
    "open", "accepted", "in_progress", "fulfilled", "verified", "reopened", "cancelled"
  ])("status").default("open"),
  creditAmount: numeric("credit_amount", { precision: 10, scale: 2 }),
  locationName: text("location_name"), lat: doublePrecision("lat"), lng: doublePrecision("lng"),
  buildId: uuid("build_id").references(() => builds.id),   // set only when category = builds
  isAnonymous: boolean("is_anonymous").default(false),      // campus sensitive-report mode
  metadata: jsonb("metadata"),   // category-specific: skill tags, urgency, role needed, sla hours...
  upvoteCount: integer("upvote_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postEvents = pgTable("post_events", {   // the ONE audit trail, shared by every category
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  actorId: uuid("actor_id").references(() => users.id),
  fromStatus: text("from_status"), toStatus: text("to_status"),
  note: text("note"), attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const responses = pgTable("responses", {   // someone accepting/fulfilling a post
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  responderId: uuid("responder_id").references(() => users.id),
  status: pgEnum("response_status", ["proposed", "accepted", "declined", "completed"])("status").default("proposed"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ledgerEntries = pgTable("ledger_entries", {   // one ledger, all categories
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  userId: uuid("user_id").references(() => users.id),
  direction: pgEnum("direction", ["debit", "credit"])("direction").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").references(() => posts.id),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  revieweeId: uuid("reviewee_id").references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scarcitySnapshots = pgTable("scarcity_snapshots", {   // Skills category only
  id: uuid("id").defaultRandom().primaryKey(),
  skillTag: text("skill_tag").notNull(),
  multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull(),
  computedAt: timestamp("computed_at").defaultNow(),
});

// ── builds — the one category with a richer persistent entity ──
export const builds = pgTable("builds", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: pgEnum("build_type", ["fyp", "startup", "hackathon", "research"])("type").notNull(),
  department: text("department"), year: integer("year"),
  pipelineStage: pgEnum("pipeline_stage", [
    "idea", "prototype", "validated", "incubated", "launched"
  ])("pipeline_stage").default("idea"),
  reportUrl: text("report_url"), repoUrl: text("repo_url"), demoUrl: text("demo_url"),
  coverImageUrl: text("cover_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
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
```

Compare this to a three-domain schema (separate `issues`, `skills`/`sessions`, `projects` tables with parallel logic): here there's **one `posts` table and one `postEvents` table handling all three categories**, with `builds` existing only where genuinely richer persistent state is needed. That's a stronger, leaner architecture — fewer tables doing more, not three domains dressed identically.

---

## 10. Design System — "Buzz"

One cohesive design language for the whole platform, with a distinct accent color per category so users always know what they're looking at in the mixed feed — without ever feeling like three different apps.

### 10.1 Color Palette

| Token | Hex | Use |
|---|---|---|
| `graphite-950` (shell dark bg) | `#0E1116` | App shell background, dark mode |
| `graphite-800` | `#181D24` | Card surfaces (dark) |
| `paper-50` (shell light bg) | `#F7F6F3` | Public/landing pages, light mode |
| `paper-100` | `#FFFFFF` | Card surfaces (light) |
| **`campus-ember-500`** | `#F0653C` | Campus accent — urgency, repair |
| **`skills-teal-500`** | `#2F8F7D` | Skills accent — growth, reciprocity |
| **`builds-violet-500`** | `#6E56CF` | Builds accent — ideas, ambition |
| `success-500` | `#22C55E` | Verified / completed / launched states, shared |
| `warning-500` | `#F5A623` | In-progress / pending confirmation, shared |
| `danger-500` | `#EF4444` | Breached SLA / disputed / cancelled, shared |
| `text-primary` | `#F5F6F7` (dark) / `#14181C` (light) | Body text |
| `text-muted` | `#8A93A6` | Secondary text |

**Category color convention:** each post card in the feed carries a small colored category tag (not a full-card tint) — enough to scan the mixed feed at a glance, without visually fragmenting it into three different-looking sub-apps.

### 10.2 Typography

- **Display / Headings:** [General Sans](https://www.fontshare.com/fonts/general-sans) or [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).
- **UI / Body:** [Inter](https://fonts.google.com/specimen/Inter).
- **Data / Codes / Ledger / Tracking IDs:** [IBM Plex Mono](https://www.ibm.com/plex/) — used identically for post IDs, credit amounts, and timestamps across all categories.

### 10.3 Visual Language

- **The honeycomb motif, used once, deliberately.** The landing page hero renders the three categories as hexagonal cells assembling into a single honeycomb — a hive is the natural image for small, buzzing activity across many cells forming one whole. Don't repeat this motif elsewhere.
- **Live activity as a literal "buzz."** A small ambient pulsing indicator in the shell nav reflects real-time platform activity — a post just resolved, a session just booked, a project just advanced — so the name is felt, not just stated.
- **One shared `<LifecycleTimeline>` component**, used on every `/posts/[id]` page regardless of category — same visual component, category-tinted, reinforcing at the UI level that this is one system underneath.
- **Corners & elevation:** 12px radius, thin 1px borders, minimal shadow — consistent across the whole app.
- **Motion:** status transitions (post resolved, credit released, pipeline stage advanced) all use the same spring-based transition on the shared timeline component.

### 10.4 Component Approach (no shadcn)

A single `packages/ui` library on **Radix UI primitives**, styled against the Buzz tokens: `Button`, `Input`, `Select`, `Dialog`, `Tabs`, `Toast`, `Tooltip`, `DropdownMenu`, `Badge`, plus shared composites: `PostCard` (category-tinted), `LifecycleTimeline`, `LedgerRow`, `BuildCard`, `FeedFilterChips`.

---

## 11. Non-Functional Requirements

- **RBAC enforced at the query layer**, not just UI — five roles across one shared data model.
- **Ledger correctness and audit-trail immutability are non-negotiable.** `postEvents` is append-only; all credit moves go through one transactional `transferCredits()` function.
- **Sensitive Campus posts** (`isAnonymous = true`) never expose the author outside the Safety Officer role, even to platform admins viewing other categories.
- **The feed's ranking must degrade gracefully** — a new user with no location, skills, or department set should still see a sensible, non-empty default feed (recency-ranked, mixed categories).
- **Test coverage:** unit tests for `transitionPost()` and `transferCredits()` at minimum — the two functions where correctness matters most.

---

## 12. Success Metrics

| Category | Metric |
|---|---|
| Campus | % resolved within SLA, recurring-risk flags raised |
| Skills | Sessions completed, Scarcity Index spread, credit velocity |
| Builds | Projects archived, teammates found via feed, projects advanced past `Idea` |
| **Platform (the real test)** | **% of users with at least one completed post in ≥2 different categories** — this is the number that proves the unified-feed model is actually working, not just three features coexisting |

---

## 13. Build Plan (Phased — scales to whatever timeline your competition gives you)

| Phase | Focus | Deliverable |
|---|---|---|
| **1. Foundation** | Nx monorepo, `packages/db` full shared schema, `packages/core` lifecycle + credit-transfer functions with tests, `packages/ui` base components, auth + RBAC | The shared substrate everything else builds on |
| **2. The Feed + Compose Flow** | `/feed`, `/post/new`, `/posts/[id]` — the core Ask/Give loop, category-agnostic | Build this before any category-specific logic — it's the spine of the whole app |
| **3. Campus specifics** | Map pin, photo upload, SLA countdown, Trust dashboard tab | First category layered on top of the shared spine |
| **4. Skills specifics** | Escrow flow, wallet, Scarcity Index | Second category — reuses the same `posts`/`responses` tables |
| **5. Builds specifics** | Build pages, pipeline stage, team/milestones, teammate discovery via the feed | Third category — should be the fastest to build, since the feed and lifecycle are already proven |
| **6. Cross-cutting polish** | Unified Buzz Score, daily digest, admin console, responsive pass, seed data across all three categories, test coverage, docs | Full-stack competitions typically weight documentation and code quality — budget real time here |

**Sequencing rationale:** building the feed and compose flow *before* any category-specific logic is the key difference from the original three-module plan — it forces the shared architecture to be real from day one, rather than something you retrofit after building three separate things.

---

## 14. Presenting This

Lead with the **feed itself**, not a feature tour:
1. Open `/feed` — show it genuinely mixed: a Campus post, a Skills post, a Builds post, in one scroll.
2. Post a new Ask live, pick a category, show it appear in the feed immediately next to unrelated categories.
3. Resolve a post from a *different* category than the one you just posted in — this is the moment that proves it's one habit, not three.
4. Show the schema (Section 9.2) — one `posts` table doing the work of what used to be three domains. For a full-stack competition, a judge who sees your data model understands the engineering decision more than any UI walkthrough.
5. Close on the one metric that matters (Section 12): % of users active in 2+ categories.

---

## 15. Naming

**Buzz.** Campus life is genuinely full of small, constant activity — a report going in, a session getting booked, an idea picking up momentum — and "buzz" is exactly what that looks and sounds like from outside. Short, energetic, and it doubles as the platform's actual value proposition in one word: something is always happening here.

---

## 16. Judging Criteria Alignment

| Likely criterion | How Buzz answers it |
|---|---|
| Problem relevance | Three real, independently-validated campus problems, unified rather than diluted |
| System architecture | One shared entity (`posts`) and one shared lifecycle function serving three domains — not three domains dressed the same |
| Database design | A genuinely lean schema — category and metadata absorb variation instead of parallel table sets |
| Full-stack depth | Auth/RBAC across five roles, transactional integrity (ledger + audit trail), real-time feed updates, tested core functions |
| Design quality | One cohesive design system with category-level accent differentiation, no shadcn |
| Completeness | A fully working shared feed plus three fully working category layers on top of it |
| Originality | The Ask/Give unification and the "no separate cross-module feature needed, the feed just does it" teammate-discovery flow are both structurally distinctive |
| Adoption / product thinking | A concrete, measurable claim (Section 12) about why this design gets used by everyone, not just three subsets of users |

---

**Next steps I can help with:** scaffold the actual Nx monorepo — starting with `packages/core`'s `transitionPost()` and `transferCredits()` functions and the `posts`/`postEvents`/`responses` schema, since the entire platform now depends on that shared foundation being right before any category-specific work begins.
