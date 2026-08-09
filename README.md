# Buzz

### One feed. Ask for help, give a hand.

A campus platform where every need and every offer — a broken AC, an hour of
tutoring, a project missing an embedded-systems person — is the same kind of
post: an **Ask** or a **Give**, tagged `campus`, `skills` or `builds`, flowing
through one shared feed with one wallet and one reputation score behind it.

Full product context is in [`docs/PRD.md`](docs/PRD.md). This file is how to
run it.

---

## Quick start

Requires **Node 20.11+** and **Docker** (for Postgres).

```bash
git clone <this repo> && cd buzz
npm install

cp .env.example .env          # then edit AUTH_SECRET — see below
docker compose up -d          # Postgres on 5432, a test instance on 5433

npm run db:migrate            # apply the schema
npm run db:seed               # a campus with a month of history in it

npm run dev                   # http://localhost:3000
```

Generate a real `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Restricting sign-up to your campus

Set `CAMPUS_EMAIL_DOMAINS` to your institution's domain. Subdomains are
included automatically, which is what department-scoped addresses need:

```bash
CAMPUS_EMAIL_DOMAINS=sjcetpalai.ac.in
#   ✔ abinantony2028@sjcetpalai.ac.in
#   ✔ abinantony2028@es.sjcetpalai.ac.in
#   ✘ someone@othercollege.ac.in
```

Leave it unset and Buzz accepts any domain that isn't a known consumer or
disposable mail provider — Gmail, Yahoo, Outlook/Live/Hotmail, iCloud,
Proton, QQ, Mail.ru, Mailinator and friends are rejected, everything else
gets through. That default exists so a fresh clone works for **any** college,
including the many with no academic marker in their domain: `ethz.ch`,
`tudelft.nl`, `mcgill.ca`, `unibo.it`, `kth.se`. There is no pattern that
matches those and not `gmail.com`, so the check is a blocklist rather than a
guess.

Because that default also accepts company and personal domains, set the
allowlist before you ship. `CAMPUS_EMAIL_MODE=academic` is the middle ground
for a multi-college deployment: it accepts `.edu`, `.ac.*`, `uni-*`,
`univ-*`, `student.*` and similar, at the cost of rejecting the marker-less
universities above.

### Seeded accounts

All use the password `buzz1234`.

| Email | Role | Worth signing in as, to see |
|---|---|---|
| `aisha@buzzcampus.edu` | student | The ordinary case — posts in two categories |
| `priya@buzzcampus.edu` | student | Leads EcoTrack; open roles and the pipeline |
| `joseph@buzzcampus.edu` | staff | The Campus queue and SLA breaches |
| `kavitha@buzzcampus.edu` | safety | The only role that can see sensitive reports |
| `rebecca@buzzcampus.edu` | mentor | The Builds console |
| `admin@buzzcampus.edu` | admin | All three admin consoles |

Sensitive reports are the thing to actually test: sign in as `admin`, note
that the anonymous lighting report is nowhere to be found, then sign in as
`kavitha` and watch it appear. That exclusion is enforced in the SQL, not
in a component.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm test` | Full test suite |
| `npm run typecheck` | Typecheck every package |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push the schema without a migration (dev only) |
| `npm run db:seed` | Wipe and reseed |
| `npm run db:studio` | Drizzle Studio |

### Tests

```bash
npm test
```

87 tests. Two layers, by design:

- **Pure unit tests** — the status graph, the authorisation rules, the escrow
  rules, credit arithmetic, the scarcity curve, the SLA maths, the
  sensitive-report policy. No database, always run.
- **Transactional tests** — row locking, ledger rows, escrow round-trips,
  concurrent-spend serialisation, against real Postgres. These run when
  `TEST_DATABASE_URL` is set (it is, in `.env.example`, pointing at the
  `db-test` container) and skip cleanly when it isn't, so `npm test` passes on
  a fresh clone with no database.

The two functions that carry the most correctness risk — `transitionPost()`
and `transferCredits()` — are covered at both layers.

---

## Layout

```
apps/web/          Next.js 15, App Router. Routes and UI only —
                   almost no business logic.
  server/          tRPC routers, context, Auth.js config
  components/      app-specific composites
  lib/             tRPC client/server wiring, the SSE hook

packages/db/       Drizzle schema + client. The lowest layer, no
                   internal dependencies.
packages/core/     transitionPost, transferCredits, ranking, scarcity,
                   the Buzz Score, RBAC policy, Zod schemas, tests.
                   Imports packages/db; nothing else.
packages/ui/       The design system on Radix primitives. Presentation
                   only — never imports db or core.

scripts/seed.mts   Composes db + core, so it sits above both.
```

Package boundaries are described in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
and are real constraints, not aspirations.

One split worth knowing about: `@buzz/core` is the server surface, and
`@buzz/core/client` is the isomorphic subset (constants, money maths, Zod
schemas, SLA maths). Client Components import the latter — importing the
root barrel from the browser would drag the Postgres driver into the bundle.

---

## Stack

Next.js 15 (App Router, RSC) · tRPC v11 · TanStack Query · Drizzle ORM ·
PostgreSQL · Auth.js v5 · Zod · Tailwind · Radix UI primitives ·
Framer Motion · Recharts · Vitest.

No shadcn/ui. Every component is built from scratch on Radix primitives
against the tokens in `apps/web/tailwind.config.ts` — see
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

---

## How it actually works

### One table, three categories

There is one `posts` table and one `post_events` table for the whole
platform. `category` and a `metadata` JSONB column carry everything that
varies; the lifecycle, the audit trail and the transition function are
shared. A maintenance report, a tutoring session and a vacant seat on a
startup team are the same row shape walking the same graph:

```
open → accepted → in_progress → fulfilled → verified
                                     ↘ reopened ↴
                                       cancelled
```

### Two functions everything routes through

- **`transitionPost()`** (`packages/core/lifecycle.ts`) — the only way a
  post's status ever changes. One transaction: lock the row, check the move
  is legal and that this actor may make it, append an immutable
  `post_events` row, update the status, then run the consequences (escrow,
  contribution points) in that same transaction. If the status moved, those
  ran.
- **`transferCredits()`** (`packages/core/ledger.ts`) — the only way a
  balance ever changes. `SELECT … FOR UPDATE` on both wallets, so two
  concurrent spends serialise instead of double-spending. Escrow is modelled
  as a transfer to and from `null` (the platform), which keeps one primitive
  instead of three and leaves a ledger row for every movement. Every wallet
  balance is reconstructible by replaying its own ledger — `/wallet` shows
  the check.

There is no `UPDATE posts SET status` or `UPDATE wallets SET balance`
anywhere else in the codebase. Grep for them.

### The feed is the product

`/feed` is one ranked list mixing all three categories. Ranking is a single
SQL expression (`packages/core/ranking.ts`): recency decay, plus additive
boosts for proximity (Campus), matching skill tags (Skills), required-role
tags matching what you've offered (Builds), your department, and your own
threads that someone is waiting on.

Every personalisation term is **additive on top of recency, never a filter**,
so a brand-new user with no location, no skills and no department still gets
a sensible, non-empty, mixed feed.

Teammate discovery has no separate mechanism. Posting an open role creates an
ordinary Ask, and the shared ranking surfaces it to people whose Skills posts
carry those tags. `/builds/[id]/team` shows you who that will be before you
post it.

### RBAC at the query layer

Sensitive Campus reports (`is_anonymous = true`) are filtered out in SQL for
everyone except the reporter and the Safety Officer — explicitly including
platform admins. `post.byId` returns a genuine 404 rather than hiding a div,
and the author is redacted on the way out even if a row ever leaked. The
viewer's role is read from the database per request, not from the session
token, so revoking someone's `admin` role takes effect on their next request
rather than whenever their JWT happens to expire.

### Realtime

Mutations call `pg_notify`; `/api/events` holds a `LISTEN` connection and
forwards to the browser over SSE, which nudges the feed to refetch. Not every
managed Postgres exposes `LISTEN/NOTIFY`, so the route falls back to polling
`post_events` — the client can't tell the difference, and the ambient pulse in
the nav shows which transport is live.

---

## Deploying

Vercel + Neon is the intended target and needs no code changes — point
`DATABASE_URL` at the Neon connection string (the client enables TLS
automatically for anything that isn't localhost) and set `AUTH_SECRET` and
`CAMPUS_EMAIL_DOMAINS`.

Run `npm run db:migrate` against the production database before the first
deploy.

---

## Known gaps

Honest list, rather than a claim of completeness:

- **Photos are URLs, not uploads.** The compose flow and the verify dialog
  take image URLs. Wiring Vercel Blob or S3 behind those fields is a
  contained change — the schema and UI already carry them.
- **The daily digest is pull, not push.** It's computed and shown in the
  notification panel; nothing emails it.
- **Recurring-issue detection flags, it doesn't escalate.** The admin console
  surfaces a location that's produced the same fault three times in 30 days;
  auto-escalation on SLA breach is listed as a stretch goal in the PRD and
  isn't built.
- **`builds.pipelineStage` uses a stage-marker post** to write into the shared
  `post_events` trail rather than a separate stage-events table. That was the
  deliberate choice `docs/BUILD_PLAN.md` Phase 5 asks you to confirm — it keeps
  one audit trail, at the cost of one synthetic post per project.
- **No map tiles.** Campus posts carry lat/lng and rank on real distance, but
  the pin is captured via the browser's geolocation rather than picked off a
  map.
