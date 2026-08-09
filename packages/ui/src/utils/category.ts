/**
 * The category accent system, in one place.
 *
 * docs/DESIGN_SYSTEM.md §4: these colours mark *which category something
 * belongs to*. They are not a decoration palette. A card gets a small tag
 * plus a hairline accent edge — never a full background tint, and never all
 * three blended together.
 */

export type CategoryKey = "campus" | "skills" | "builds";

export type CategoryTokens = {
  key: CategoryKey;
  label: string;
  /** what this category is for, in the user's language */
  blurb: string;
  text: string;
  /** the 2px edge on a PostCard */
  edge: string;
  /** small solid dot / tag background at low alpha */
  dot: string;
  tagBg: string;
  tagText: string;
  ring: string;
  /** category-scoped primary button (DESIGN_SYSTEM §4) */
  button: string;
  /** raw hex, for Recharts and inline SVG where Tailwind can't reach */
  hex: string;
  hexSoft: string;
};

export const CATEGORY: Record<CategoryKey, CategoryTokens> = {
  campus: {
    key: "campus",
    label: "Campus",
    blurb: "Facilities, spaces, things that are broken",
    text: "text-campus-ember-500",
    edge: "bg-campus-ember-500",
    dot: "bg-campus-ember-500",
    tagBg: "bg-campus-ember-500/10",
    tagText: "text-campus-ember-400",
    ring: "focus-visible:ring-campus-ember-500",
    button:
      "bg-campus-ember-500 text-graphite-950 hover:bg-campus-ember-400 focus-visible:ring-campus-ember-500",
    hex: "#F0653C",
    hexSoft: "#F58762",
  },
  skills: {
    key: "skills",
    label: "Skills",
    blurb: "Trading what you know for what you don't",
    text: "text-skills-teal-500",
    edge: "bg-skills-teal-500",
    dot: "bg-skills-teal-500",
    tagBg: "bg-skills-teal-500/10",
    tagText: "text-skills-teal-400",
    ring: "focus-visible:ring-skills-teal-500",
    button:
      "bg-skills-teal-500 text-graphite-950 hover:bg-skills-teal-400 focus-visible:ring-skills-teal-500",
    hex: "#2F8F7D",
    hexSoft: "#4FAE9B",
  },
  builds: {
    key: "builds",
    label: "Builds",
    blurb: "Projects, teams and everything that came before",
    text: "text-builds-violet-500",
    edge: "bg-builds-violet-500",
    dot: "bg-builds-violet-500",
    tagBg: "bg-builds-violet-500/10",
    tagText: "text-builds-violet-400",
    ring: "focus-visible:ring-builds-violet-500",
    button:
      "bg-builds-violet-500 text-paper-100 hover:bg-builds-violet-400 focus-visible:ring-builds-violet-500",
    hex: "#6E56CF",
    hexSoft: "#8A73DE",
  },
};

export const CATEGORY_KEYS: CategoryKey[] = ["campus", "skills", "builds"];

export function categoryTokens(key: string | null | undefined): CategoryTokens {
  return CATEGORY[(key ?? "campus") as CategoryKey] ?? CATEGORY.campus;
}

/**
 * Status colours are shared across all three categories — a verified Campus
 * fix and a verified Skills session are the same green. Deliberate: status
 * is a platform concept, not a category concept.
 */
export const STATUS_TOKENS: Record<
  string,
  { label: string; text: string; bg: string; dot: string; hex: string }
> = {
  open: {
    label: "Open",
    text: "text-text-muted",
    bg: "bg-text-muted/10",
    dot: "bg-text-muted",
    hex: "#8A93A6",
  },
  accepted: {
    label: "Accepted",
    text: "text-warning-500",
    bg: "bg-warning-500/10",
    dot: "bg-warning-500",
    hex: "#F5A623",
  },
  in_progress: {
    label: "In progress",
    text: "text-warning-500",
    bg: "bg-warning-500/10",
    dot: "bg-warning-500",
    hex: "#F5A623",
  },
  fulfilled: {
    label: "Fulfilled",
    text: "text-warning-500",
    bg: "bg-warning-500/10",
    dot: "bg-warning-500",
    hex: "#F5A623",
  },
  verified: {
    label: "Verified",
    text: "text-success-500",
    bg: "bg-success-500/10",
    dot: "bg-success-500",
    hex: "#22C55E",
  },
  reopened: {
    label: "Reopened",
    text: "text-danger-500",
    bg: "bg-danger-500/10",
    dot: "bg-danger-500",
    hex: "#EF4444",
  },
  cancelled: {
    label: "Cancelled",
    text: "text-text-muted",
    bg: "bg-text-muted/10",
    dot: "bg-text-muted",
    hex: "#8A93A6",
  },
};

export function statusTokens(status: string | null | undefined) {
  return STATUS_TOKENS[status ?? "open"] ?? STATUS_TOKENS.open!;
}
