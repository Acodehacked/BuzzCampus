"use client";

import { motion } from "framer-motion";
import { cn } from "../utils/cn";
import { CATEGORY, CATEGORY_KEYS, type CategoryKey } from "../utils/category";

/**
 * The one filter row on the one feed. "All" is the default and it is the
 * first thing selected — the mixed feed is the product, and the filters are
 * a narrowing of it, not three tabs pretending to be one screen
 * (docs/PRD.md §3).
 *
 * The selected chip carries a shared layout element, so switching category
 * slides the highlight across rather than blinking it — the row reads as
 * one control with a position, not four independent buttons.
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
      className={cn("flex items-center gap-1.5 overflow-x-auto pb-0.5", className)}
    >
      <Chip
        selected={value === "all"}
        onClick={() => onChange("all")}
        count={counts?.all}
        label="All"
        highlight="bg-text-primary-dark"
        selectedText="text-graphite-950"
      />
      {CATEGORY_KEYS.map((key) => {
        const tokens = CATEGORY[key];
        return (
          <Chip
            key={key}
            selected={value === key}
            onClick={() => onChange(key)}
            count={counts?.[key]}
            label={tokens.label}
            dot={tokens.dot}
            highlight={tokens.edge}
            selectedText="text-graphite-950"
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
  highlight,
  selectedText,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
  dot?: string;
  highlight: string;
  selectedText: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
        "transition-colors duration-150 active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-muted",
        selected
          ? selectedText
          : "text-text-muted hover:bg-graphite-800 hover:text-text-primary-dark",
      )}
    >
      {selected ? (
        <motion.span
          layoutId="feed-chip-highlight"
          aria-hidden
          className={cn("absolute inset-0 rounded-full", highlight)}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      ) : null}

      <span className="relative flex items-center gap-1.5">
        {dot ? (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              selected ? "bg-graphite-950/60" : dot,
            )}
            aria-hidden
          />
        ) : null}
        {label}
        {typeof count === "number" ? (
          <span
            className={cn(
              "font-mono tabular-nums",
              selected ? "opacity-60" : "opacity-50",
            )}
          >
            {count}
          </span>
        ) : null}
      </span>
    </button>
  );
}
