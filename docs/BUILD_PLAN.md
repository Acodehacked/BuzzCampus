# BUILD_PLAN.md
### A sequential checklist — work through phases in order, don't skip ahead

Each phase should be genuinely working (buildable, runnable, testable) before moving to the next. If you're an AI agent picking up this repo mid-way, check which phase's boxes are already done by inspecting the codebase rather than assuming — don't redo completed work, and don't jump ahead of unfinished phases.

---

## Phase 1 — Foundation

- [ ] Nx monorepo scaffolded per `docs/ARCHITECTURE.md`
- [ ] `packages/db/schema.ts` in place exactly as specified (see the provided `schema.ts`)
- [ ] Drizzle migrations generated and applied against a Neon Postgres instance
- [ ] `packages/core/lifecycle.ts`: `transitionPost()` implemented as a single DB transaction (read status → write `postEvents` row → update `posts.status`), with unit tests
- [ ] `packages/core/ledger.ts`: `transferCredits()` implemented as a single DB transaction (never a direct balance UPDATE elsewhere in the codebase), with unit tests
- [ ] Auth.js wired up with campus-email restriction and the five roles from `schema.ts`
- [ ] `packages/ui/primitives` — base Radix-backed components (Button, Input, Select, Dialog, Tabs, Toast, Tooltip, DropdownMenu, Badge) styled per `docs/DESIGN_SYSTEM.md`, **not shadcn**
- [ ] `tailwind.config.ts` and `globals.css` in place, fonts loading via `next/font`

## Phase 2 — The Feed + Compose Flow (category-agnostic)

Build this before any Campus/Skills/Builds-specific logic — it's the spine everything else sits on.

- [ ] `/feed` — mixed, filterable (All/Campus/Skills/Builds) list of posts, ranked by recency by default
- [ ] `PostCard` composite component (category-tinted per `docs/DESIGN_SYSTEM.md` Section 4)
- [ ] `/post/new` — Ask-or-Give → category picker → category-specific fields (start minimal; fields can be extended in Phases 3–5)
- [ ] `/posts/[id]` — detail view, `LifecycleTimeline` component, respond/accept flow calling `transitionPost()`
- [ ] Realtime feed updates (Postgres LISTEN/NOTIFY → SSE, or polling as a fallback if time is short)

## Phase 3 — Campus

- [ ] Extend the compose flow: photo upload, map pin, urgency field (stored in `posts.metadata`)
- [ ] SLA countdown display, computed from `metadata.slaHours` + `posts.createdAt`
- [ ] Staff queue view — a filtered `/feed` view scoped to `category = campus` and the staff member's department
- [ ] Verify & close flow requiring an after-photo before `status = verified`
- [ ] Recurring-issue detection query (same `locationName` + category tag ≥3x in 30 days)
- [ ] Anonymous/sensitive mode (`isAnonymous = true`), restricted visibility enforced at the query layer, not just hidden in the UI
- [ ] `/trust` Campus tab — resolution rate, avg time, category breakdown (Recharts)

## Phase 4 — Skills

- [ ] Extend the compose flow: skill tag, duration, credit amount fields
- [ ] Starter credit grant on user signup (`wallets.balance` defaults to `2.00`, confirm this actually happens, not just the schema default)
- [ ] Accept → escrow lock (`transferCredits` debit into a held state) → dual confirmation → release flow
- [ ] `/wallet` — balance + ledger history table
- [ ] Scarcity Index computation (`packages/core/scarcity.ts`) — simple ratio-based formula, scheduled recompute, stored in `scarcity_snapshots`
- [ ] Scarcity Index chart on `/feed` (Skills filter) and `/wallet`
- [ ] Review flow after a completed session, feeding `contribution_events`

## Phase 5 — Builds

- [ ] `builds` CRUD: create/edit a Build page, upload report/repo/demo links, cover image
- [ ] `/builds/[id]` — pipeline stage display using the same `LifecycleTimeline` component as Campus/Skills posts
- [ ] Pipeline stage transitions via `transitionPost()` — note: `builds.pipelineStage` transitions should also write to `postEvents` if a linked post exists, or a dedicated build-stage-events approach if you've deviated from the shared schema — confirm which pattern the schema in this repo actually uses before implementing
- [ ] Team management (`build_team_members`) and open-role posting (an `Ask`, `category = builds`, `buildId` set)
- [ ] Confirm open-role Asks actually surface in `/feed` ranked toward users whose Skills posts match the required tag — this is the teammate-discovery mechanism, verify it works end-to-end, don't leave it as a stub
- [ ] Milestone log (`build_milestones`)
- [ ] Public searchable/filterable Builds archive (department, year, domain, stage)

## Phase 6 — Cross-Cutting Polish

- [ ] Unified Buzz Score on `/profile/[id]`, derived from `contribution_events` across all three categories — confirm it's genuinely one number, not three sub-scores displayed together
- [ ] Daily digest notification mixing one item per relevant category
- [ ] Admin console: `/admin/campus`, `/admin/skills`, `/admin/builds`
- [ ] Responsive pass across all core screens
- [ ] Seed data script covering all three categories with realistic variety (don't demo/test against an empty database)
- [ ] Full pass against `docs/DESIGN_SYSTEM.md` Section 3 (banned patterns) — check the actual rendered UI, not just the code, for gradient hero backgrounds, glassmorphism, gradient text, over-rounded corners, emoji-icons, and generic stat-card grids
- [ ] README with setup instructions, and this doc set kept up to date if anything diverged during the build

---

## When Something Doesn't Fit This Plan

If a request comes in that doesn't map cleanly onto a phase above (a bug fix, a design tweak, an unplanned feature), that's fine — just don't let it substitute for finishing the current phase's checklist first unless explicitly asked to prioritize it.
