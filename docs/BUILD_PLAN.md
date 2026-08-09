# BUILD_PLAN.md
### A sequential checklist — work through phases in order, don't skip ahead

Each phase should be genuinely working (buildable, runnable, testable) before moving to the next. If you're an AI agent picking up this repo mid-way, check which phase's boxes are already done by inspecting the codebase rather than assuming — don't redo completed work, and don't jump ahead of unfinished phases.

> **Status:** all six phases are built. `npm run build` and `npm test` (87
> tests) both pass. Deviations from the original plan, and the things
> deliberately left undone, are listed at the bottom of this file and in the
> README's "Known gaps".

---

## Phase 1 — Foundation

- [x] Nx monorepo scaffolded per `docs/ARCHITECTURE.md`
- [x] `packages/db/schema.ts` in place exactly as specified (see the provided `schema.ts`)
- [x] Drizzle migrations generated and applied against a Neon Postgres instance
- [x] `packages/core/lifecycle.ts`: `transitionPost()` implemented as a single DB transaction (read status → write `postEvents` row → update `posts.status`), with unit tests
- [x] `packages/core/ledger.ts`: `transferCredits()` implemented as a single DB transaction (never a direct balance UPDATE elsewhere in the codebase), with unit tests
- [x] Auth.js wired up with campus-email restriction and the five roles from `schema.ts`
- [x] `packages/ui/primitives` — base Radix-backed components (Button, Input, Select, Dialog, Tabs, Toast, Tooltip, DropdownMenu, Badge) styled per `docs/DESIGN_SYSTEM.md`, **not shadcn**
- [x] `tailwind.config.ts` and `globals.css` in place, fonts loading via `next/font`

## Phase 2 — The Feed + Compose Flow (category-agnostic)

Build this before any Campus/Skills/Builds-specific logic — it's the spine everything else sits on.

- [x] `/feed` — mixed, filterable (All/Campus/Skills/Builds) list of posts, ranked by recency by default
- [x] `PostCard` composite component (category-tinted per `docs/DESIGN_SYSTEM.md` Section 4)
- [x] `/post/new` — Ask-or-Give → category picker → category-specific fields (start minimal; fields can be extended in Phases 3–5)
- [x] `/posts/[id]` — detail view, `LifecycleTimeline` component, respond/accept flow calling `transitionPost()`
- [x] Realtime feed updates (Postgres LISTEN/NOTIFY → SSE, or polling as a fallback if time is short)

## Phase 3 — Campus

- [x] Extend the compose flow: photo upload, map pin, urgency field (stored in `posts.metadata`)
- [x] SLA countdown display, computed from `metadata.slaHours` + `posts.createdAt`
- [x] Staff queue view — a filtered `/feed` view scoped to `category = campus` and the staff member's department
- [x] Verify & close flow requiring an after-photo before `status = verified`
- [x] Recurring-issue detection query (same `locationName` + category tag ≥3x in 30 days)
- [x] Anonymous/sensitive mode (`isAnonymous = true`), restricted visibility enforced at the query layer, not just hidden in the UI
- [x] `/trust` Campus tab — resolution rate, avg time, category breakdown (Recharts)

## Phase 4 — Skills

- [x] Extend the compose flow: skill tag, duration, credit amount fields
- [x] Starter credit grant on user signup (`wallets.balance` defaults to `2.00`, confirm this actually happens, not just the schema default)
- [x] Accept → escrow lock (`transferCredits` debit into a held state) → dual confirmation → release flow
- [x] `/wallet` — balance + ledger history table
- [x] Scarcity Index computation (`packages/core/scarcity.ts`) — simple ratio-based formula, scheduled recompute, stored in `scarcity_snapshots`
- [x] Scarcity Index chart on `/feed` (Skills filter) and `/wallet`
- [x] Review flow after a completed session, feeding `contribution_events`

## Phase 5 — Builds

- [x] `builds` CRUD: create/edit a Build page, upload report/repo/demo links, cover image
- [x] `/builds/[id]` — pipeline stage display using the same `LifecycleTimeline` component as Campus/Skills posts
- [x] Pipeline stage transitions via `transitionPost()` — note: `builds.pipelineStage` transitions should also write to `postEvents` if a linked post exists, or a dedicated build-stage-events approach if you've deviated from the shared schema — confirm which pattern the schema in this repo actually uses before implementing
- [x] Team management (`build_team_members`) and open-role posting (an `Ask`, `category = builds`, `buildId` set)
- [x] Confirm open-role Asks actually surface in `/feed` ranked toward users whose Skills posts match the required tag — this is the teammate-discovery mechanism, verify it works end-to-end, don't leave it as a stub
- [x] Milestone log (`build_milestones`)
- [x] Public searchable/filterable Builds archive (department, year, domain, stage)

## Phase 6 — Cross-Cutting Polish

- [x] Unified Buzz Score on `/profile/[id]`, derived from `contribution_events` across all three categories — confirm it's genuinely one number, not three sub-scores displayed together
- [x] Daily digest notification mixing one item per relevant category
- [x] Admin console: `/admin/campus`, `/admin/skills`, `/admin/builds`
- [x] Responsive pass across all core screens
- [x] Seed data script covering all three categories with realistic variety (don't demo/test against an empty database)
- [x] Full pass against `docs/DESIGN_SYSTEM.md` Section 3 (banned patterns) — check the actual rendered UI, not just the code, for gradient hero backgrounds, glassmorphism, gradient text, over-rounded corners, emoji-icons, and generic stat-card grids
- [x] README with setup instructions, and this doc set kept up to date if anything diverged during the build

---

## When Something Doesn't Fit This Plan

If a request comes in that doesn't map cleanly onto a phase above (a bug fix, a design tweak, an unplanned feature), that's fine — just don't let it substitute for finishing the current phase's checklist first unless explicitly asked to prioritize it.


---

## What was built differently, and why

Recorded here so the next person doesn't assume these were oversights.

- **tRPC instead of bare server actions.** Requested explicitly. It sits where
  the plan said "server actions + TanStack Query" — tRPC uses TanStack Query
  underneath, so the caching and optimistic-update story is unchanged.
- **npm workspaces with `nx.json`, not `nx generate`.** The folder layout is
  exactly `docs/ARCHITECTURE.md`; Nx runs as the task runner over a
  package-based workspace rather than generating its own scaffolding.
- **`@buzz/core` is split into two entry points.** `@buzz/core` is the server
  surface; `@buzz/core/client` is the isomorphic subset. Client Components
  import the latter — importing the root barrel from the browser pulls the
  Postgres driver into the bundle, which fails the build.
- **Three schema additions** beyond PRD §9.2: `users.password_hash` (Auth.js
  needs somewhere to put it), `post_upvotes` (`upvote_count` alone can't stop
  double-voting), and `build_comments` (PRD §6.3 #7 asks for them). Plus
  covering indexes. All flagged in a comment at the top of `schema.ts`.
- **Notifications and the daily digest are derived, not stored.** They're a
  view over `post_events`, `responses` and `ledger_entries` rather than a
  notifications table — the same argument the rest of the platform makes about
  having one record of what happened.
- **Build pipeline stages write to `post_events`** through a per-project
  stage-marker post, rather than a separate stage-events table. Phase 5 asks
  which pattern this repo uses: it's this one.
- **Photos are URL fields, not uploads.** See the README's "Known gaps" for
  the full list of what's deliberately unfinished.
