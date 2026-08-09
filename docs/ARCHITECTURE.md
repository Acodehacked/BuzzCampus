# ARCHITECTURE.md
### Monorepo structure and package boundaries

```
buzz/
├── apps/
│   └── web/                        # the Next.js app — all routes live here
│       ├── app/
│       │   ├── (public)/
│       │   │   ├── page.tsx                     # landing page
│       │   │   └── trust/page.tsx                # public Trust dashboard
│       │   ├── (shell)/                          # authenticated app shell
│       │   │   ├── feed/page.tsx                 # home screen
│       │   │   ├── post/new/page.tsx             # compose flow
│       │   │   ├── posts/[id]/page.tsx           # post detail
│       │   │   ├── builds/[id]/page.tsx          # build project page
│       │   │   ├── builds/[id]/team/page.tsx
│       │   │   ├── profile/[id]/page.tsx
│       │   │   └── wallet/page.tsx
│       │   ├── admin/
│       │   │   ├── campus/page.tsx
│       │   │   ├── skills/page.tsx
│       │   │   └── builds/page.tsx
│       │   ├── api/                              # route handlers (webhooks, etc.)
│       │   └── layout.tsx                        # font loading, theme provider
│       └── components/                           # app-specific components only
│           # composite, page-specific components (e.g. FeedFilterBar) live
│           # here; reusable primitives live in packages/ui instead
│
├── packages/
│   ├── db/
│   │   ├── schema.ts                 # source of truth — see CLAUDE.md Rule 3
│   │   ├── migrations/               # drizzle-kit output
│   │   └── client.ts                 # Drizzle client singleton
│   │
│   ├── core/
│   │   ├── lifecycle.ts              # transitionPost() — see CLAUDE.md Rule 4
│   │   ├── ledger.ts                 # transferCredits()
│   │   ├── scarcity.ts               # Scarcity Index computation
│   │   ├── validation/                # Zod schemas, shared client + server
│   │   └── __tests__/                # unit tests for lifecycle.ts and ledger.ts
│   │
│   └── ui/
│       ├── primitives/                # Button, Input, Select, Dialog, Tabs,
│       │                               # Toast, Tooltip, DropdownMenu, Badge
│       │                               # — built on Radix, styled per
│       │                               #   DESIGN_SYSTEM.md, never shadcn
│       └── composites/                # PostCard, LifecycleTimeline, LedgerRow,
│                                       # BuildCard, FeedFilterChips
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN_SYSTEM.md
│   ├── ARCHITECTURE.md               # this file
│   └── BUILD_PLAN.md
│
├── CLAUDE.md                          # read automatically by Claude Code
├── tailwind.config.ts
└── nx.json
```

## Package Boundary Rules

- `apps/web` may import from `packages/db`, `packages/core`, and `packages/ui`. It should contain almost no business logic itself — routes call into `packages/core` functions.
- `packages/ui` may not import from `packages/db` or `packages/core` — it's presentation-only, taking data as props.
- `packages/core` may import from `packages/db` (it needs the schema to run transactions) but never from `apps/web` or `packages/ui`.
- `packages/db` has no internal dependencies — it's the lowest layer.

If a task seems to require breaking one of these boundaries, that's a signal the logic is in the wrong package — move it rather than adding a cross-boundary import.
