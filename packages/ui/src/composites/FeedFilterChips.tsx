"use client";

import { cn } from "../utils/cn";
import { CATEGORY, CATEGORY_KEYS, type CategoryKey } from "../utils/category";

/**
 * The one filter row on the one feed. "All" is the default and it is the
 * first thing selected — the mixed feed is the product, and the filters are
 * a narrowing of it, not three tabs pretending to be one screen
 * (docs/PRD.md §3).
 */
export function FeedFilterChips({
  value,
  onChange,
  counts,
  className,
}: {
  value: CategoryKey | "all";
  onChange: (next: CategoryKey | "all") => void;
  counts?: Partial<Record<CategoryKey | "all", number>>;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter the feed by category"
      className={cn("flex items-center gap-1 overflow-x-auto", className)}
    >
      <Chip
        selected={value === "all"}
        onClick={() => onChange("all")}
        count={counts?.all}
        label="All"
      />
      {CATEGORY_KEYS.map((key) => {
        const tokens = CATEGORY[key];
        const selected = value === key;
        return (
          <Chip
            key={key}
            selected={selected}
            onClick={() => onChange(key)}
            count={counts?.[key]}
            label={tokens.label}
            dot={tokens.dot}
            selectedClass={cn(tokens.tagBg, tokens.tagText)}
          />
        );
      })}
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
  count,
  dot,
  selectedClass,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
  dot?: string;
  selectedClass?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-muted",
        selected
          ? cn(
              "border-transparent",
              selectedClass ?? "bg-text-primary-dark/10 text-text-primary-dark",
            )
          : "border-graphite-700 text-text-muted hover:border-text-muted/50 hover:text-text-primary-dark",
      )}
    >
      {dot ? (
        <span className={cn("h-1.5 w-1.5 rounded-sm", dot)} aria-hidden />
      ) : null}
      {label}
      {typeof count === "number" ? (
        <span className="font-mono tabular-nums opacity-60">{count}</span>
      ) : null}
    </button>
  );
}
