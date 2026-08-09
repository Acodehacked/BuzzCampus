# CLAUDE.md
### Instructions for any AI coding assistant working on this repository

This file is read automatically by Claude Code at the start of every session in this repo. Follow it exactly. If any instruction here conflicts with a request in a prompt, this file wins unless the person explicitly overrides it in that exact conversation.

---

## 0. What This Project Is

**Buzz** — a campus platform built around one shared idea: everything on it is either an **Ask** ("I need help") or a **Give** ("I can help"), tagged with a category (`campus`, `skills`, `builds`), flowing through one shared feed. Full context: `docs/PRD.md`. Design rules: `docs/DESIGN_SYSTEM.md`. Folder layout: `docs/ARCHITECTURE.md`. Task sequence: `docs/BUILD_PLAN.md`.

Read all four before writing code. They are short by design — read them in full, not just skimmed.

---

## 1. Absolute Rules — Never Violate These

1. **Do not use shadcn/ui.** Not the CLI, not copy-pasted shadcn component code, not a shadcn-generated `components/ui` folder. Build every component from scratch on **Radix UI primitives** (`@radix-ui/react-*`), styled entirely with Tailwind against the tokens in `tailwind.config.ts`. If you catch yourself about to scaffold something that looks like shadcn's default `Button`/`Card`/`Input` (rounded-md, `border`, `shadow-sm`, `bg-card`, the default shadcn gray palette) — stop and restyle it against this project's actual tokens instead.
2. **No AI-slop visual defaults.** See `docs/DESIGN_SYSTEM.md` Section 3 for the explicit list of patterns that are banned outright (gradient hero backgrounds, glassmorphism-everywhere, generic centered-card SaaS layouts, motion-on-every-element, emoji-as-icons, etc.). This is not a style suggestion — treat it as a lint rule.
3. **One shared `posts` schema, not three domain schemas.** Campus issues, Skills requests, and Builds openings are the same `posts` table differentiated by `category` and `metadata`. Do not create separate `issues`, `skills_requests`, or similar tables — see `packages/db/schema.ts`, which is the source of truth, not a suggestion to reinterpret.
4. **Every status change goes through `transitionPost()`** in `packages/core/lifecycle.ts` — never write directly to `posts.status` from a route handler or server action. Same for credits: every balance change goes through `transferCredits()` in `packages/core/ledger.ts` — never a direct `UPDATE wallets SET balance = ...`.
5. **Use the actual color tokens** (`campus-ember-500`, `skills-teal-500`, `builds-violet-500`, `graphite-*`, `paper-*`) — never introduce ad hoc hex values or Tailwind's default `indigo`/`purple`/`violet`/`blue` palette for anything brand-related.
6. **Don't invent new pages or flatten the IA.** The full page list is in `docs/ARCHITECTURE.md` — if a task seems to need a new top-level route, check whether it actually belongs as a filtered/detail view of `/feed`, `/posts/[id]`, or `/builds/[id]` first.

---

## 2. Tech Stack (do not substitute without being asked)

- **Next.js 15**, App Router, React Server Components by default — Client Components only where interactivity genuinely requires it
- **Drizzle ORM** + **PostgreSQL** (Neon) — never raw SQL strings for app logic; migrations via `drizzle-kit`
- **Auth.js (NextAuth)** for campus-email-restricted auth + RBAC
- **Zod** for all input validation, schemas colocated in `packages/core`
- **TanStack Query** for client-side cache/optimistic updates
- **Radix UI primitives** (unstyled) as the only component foundation — see Rule 1
- **Tailwind CSS**, configured against this project's tokens — see `tailwind.config.ts`
- **Framer Motion**, used sparingly and only where called out in `docs/DESIGN_SYSTEM.md`
- **Recharts** for the Trust dashboard, Scarcity Index, and pipeline funnel charts
- **Nx monorepo** — respect package boundaries in `docs/ARCHITECTURE.md`; don't cross-import across app/package boundaries informally

---

## 3. Working Style

- **Build the shared spine before category-specific features.** Per `docs/BUILD_PLAN.md`, Phase 2 (the feed + compose flow, category-agnostic) must exist and work before any Campus/Skills/Builds-specific logic is added. If asked to jump straight to a category feature before the spine exists, flag this and build the spine first.
- **Every entity with meaningful state gets a lifecycle and an audit trail** — this is the architectural signature of the whole platform. When in doubt about whether something needs a `postEvents`-style history, it probably does.
- **Prefer editing/extending existing files over creating parallel ones.** If a component or route already exists and is close to what's needed, extend it — don't create `PostCardV2.tsx` next to `PostCard.tsx`.
- **Write the small unit tests called out in `docs/BUILD_PLAN.md`** for `transitionPost()` and `transferCredits()` as part of building them, not as an afterthought.
- **Ask before introducing a new dependency** not already listed in Section 2 — don't silently add a UI kit, icon pack, or animation library.

---

## 4. When Unsure

If a request is ambiguous about which category, page, or schema field something belongs to, check `docs/PRD.md` first — it has the full feature breakdown by category. If it's genuinely still unclear after that, ask a specific question rather than guessing at a new pattern that isn't in these docs.
