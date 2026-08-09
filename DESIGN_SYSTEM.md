# DESIGN_SYSTEM.md
### The complete visual language for Buzz — read in full before writing any UI code

---

## 1. Design Philosophy

Buzz should feel like a **considered, opinionated product** — closer to Linear, Arc, Raycast, or Stripe's docs than to a typical AI-generated landing page. The tell of an AI-slopped interface is that it's *technically fine and instantly forgettable* — correct spacing, correct contrast, zero point of view. The goal here is the opposite: a small number of specific, deliberate choices (the honeycomb motif, the category accent system, the serif/mono type pairing) used consistently and sparingly, surrounded by restrained, confident neutral space.

**Reference points for taste (do not copy their components — study their restraint):** Linear's use of a single accent color against near-black neutrals; Arc browser's confident asymmetric layouts; Stripe docs' typographic hierarchy without relying on color to do the work; Raycast's dark-mode-first, low-chrome UI.

---

## 2. Tokens

### Color

```
graphite-950   #0E1116   shell background, dark mode
graphite-900   #12161C
graphite-800   #181D24   card surfaces (dark)
graphite-700   #232A34   borders (dark)

paper-50       #F7F6F3   shell background, light mode
paper-100      #FFFFFF   card surfaces (light)
paper-200      #ECEAE4   borders (light)

campus-ember-500    #F0653C   Campus category accent
campus-ember-400    #F58762   hover
skills-teal-500     #2F8F7D   Skills category accent
skills-teal-400     #4FAE9B   hover
builds-violet-500   #6E56CF   Builds category accent
builds-violet-400   #8A73DE   hover

success-500    #22C55E
warning-500    #F5A623
danger-500     #EF4444

text-primary-dark    #F5F6F7
text-primary-light   #14181C
text-muted           #8A93A6
```

### Typography

```
Display / Headings   General Sans (fallback: Space Grotesk)     — used sparingly, hero + section titles only
UI / Body            Inter                                       — everything else
Data / Mono          IBM Plex Mono                                — post IDs, credit amounts, timestamps, SLA codes
```

Type scale (rem): `0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3` — do not introduce arbitrary sizes outside this scale.

### Spacing

4px base unit. Use Tailwind's default scale (`1 = 4px` through `24 = 96px`) — no arbitrary pixel values in `className`.

### Radius

`--radius-sm: 6px` (inputs, small controls) · `--radius-md: 10px` (cards) · `--radius-lg: 16px` (modals, feature panels). Never `rounded-full` on rectangular containers, never `rounded-3xl`+ on cards — that reads as generic/AI-default.

### Elevation

Prefer a **1px border** (`graphite-700` dark / `paper-200` light) over shadow for separating surfaces. Where a shadow is used, keep it small and tight (`0 1px 3px rgba(0,0,0,0.12)`) — never large soft "floating card" shadows.

---

## 3. Explicitly Banned Patterns

If you generate any of the following, delete it and redo the section. These are the specific, recognizable fingerprints of AI-generated UI — banning them by name is more effective than a vague "make it look good."

| Banned pattern | What to do instead |
|---|---|
| Gradient hero background (`bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500`, or any multi-hue gradient behind a hero headline) | Solid `graphite-950` or `paper-50` background. If a gradient is ever used, it must be a **single-hue, low-contrast** tint of one category color, and only once on the whole site (the landing hero, nowhere else) |
| Glassmorphism as a default (`bg-white/10 backdrop-blur-lg border border-white/20` on cards, nav bars, everything) | Solid surfaces with a 1px border. No backdrop-blur unless there's a genuine functional reason (e.g. a sticky nav over scrolling content) |
| Centered hero cliché: giant bold centered headline + centered subtext + two centered pill buttons + a vague "trusted by" logo row | Asymmetric layout: headline left-aligned or off-center, real content (a live feed preview, an actual data visualization) doing the work instead of a logo strip |
| Gradient text (`bg-clip-text text-transparent bg-gradient-to-r ...`) on headlines | Solid `text-primary` color. Let typography and layout carry weight, not a gradient effect |
| Rounded-3xl / rounded-full blobs everywhere, "friendly SaaS" over-rounding | Use the radius scale in Section 2 exactly — 6/10/16px, nothing softer |
| A 3-column grid of icon-in-a-circle "feature cards" with Heroicons/Lucide default icons and generic copy ("Fast", "Secure", "Powerful") | If features need explaining, show the actual UI doing the thing (a real screenshot/mock of the feed, the escrow flow, the Scarcity Index chart) rather than an abstracted icon grid |
| Framer Motion `initial={{opacity:0,y:20}}` fade-up-on-scroll applied to every single section/card indiscriminately | Motion is reserved for the specific moments called out in Section 5 below — status transitions, the honeycomb assembly, live feed updates. Static content stays static |
| Emoji used as functional icons (📍 for location, 💰 for credits, 🚀 for launch) | Real iconography (Lucide icons, styled to match the token system) or no icon at all if it's not adding information |
| shadcn's default look: `rounded-md border bg-card text-card-foreground shadow-sm`, the default shadcn slate/zinc palette | See CLAUDE.md Rule 1 — not permitted regardless of styling, but especially don't approximate its visual signature either |
| Dashboard "stat card" clichés: a big number, a small label, an unnecessary trending-up icon, in a 4-column grid, on every single page | Use these only where a number is genuinely the point (Trust dashboard, wallet balance) and vary the layout — not a default pattern applied everywhere there's a number to show |
| Overuse of `justify-center items-center` making every layout feel like a single centered column regardless of content | Let content determine layout. The feed is a left-aligned scrolling list. The Trust dashboard is a real dashboard grid, not centered cards. Vary composition per page |

---

## 4. Category Color Usage

Category accents (`campus-ember`, `skills-teal`, `builds-violet`) mark *which category something belongs to* — they are not a general-purpose decoration system. Rules:

- A `PostCard` gets a small colored tag/dot + left border accent in its category color — not a full background tint.
- Primary buttons **within a category-specific flow** (e.g. "Report" on a Campus post) use that category's color. Global actions (the main "+ Post" button, nav, primary CTAs on shared screens) use a neutral `graphite`/`paper` treatment, never a category color, since they're not category-specific.
- Never use all three category colors together decoratively (e.g., a gradient blending ember→teal→violet) — that's exactly the kind of arbitrary multi-hue treatment Section 3 bans. The one sanctioned exception is the honeycomb motif (Section 5), where three distinct solid-color hexagons are the entire point.

---

## 5. Signature Visual Moments (use exactly once each, don't dilute by repeating)

1. **The honeycomb motif** — on the landing page only. Three hexagonal cells (one per category color) animate into alignment forming a small honeycomb cluster near the hero headline. This is the one place the brand concept is shown literally.
2. **The live-activity pulse** — a small, quiet pulsing dot in the shell nav reflecting real-time platform activity. Subtle, not a badge with a number, not attention-grabbing.
3. **The shared `<LifecycleTimeline>` component** — used identically on every `/posts/[id]` page regardless of category, category-tinted. Status transitions animate with a short spring (150–200ms), not a long theatrical animation.
4. **The Scarcity Index bars/chart** (Skills) and the **pipeline funnel** (Builds) — these are genuine data visualizations, not decoration; they should look like real charts (Recharts, minimal styling, category-accented) not illustrative graphics.

Everything else on the platform should be quiet, confident, and typographically driven — most of the visual interest budget is spent on these four moments, not spread evenly across every screen.

---

## 6. Dark Mode Is Primary

Design and build dark mode first (`graphite-*` tokens) — it's the default for the app shell (feed, posts, wallet, admin). Light mode (`paper-*` tokens) is used for the public-facing pages only: landing, the Trust dashboard, and the Builds public archive — these are the pages a prospective student, parent, or judge might view without logging in, and a warmer, brighter register suits that audience better.
