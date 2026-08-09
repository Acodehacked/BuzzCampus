"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { categoryTokens, statusTokens, type CategoryKey } from "../utils/category";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "warning" | "danger" | "muted";
  mono?: boolean;
}

const TONE = {
  neutral:
    "border-graphite-700 text-text-primary-dark light:border-paper-200 light:text-text-primary-light",
  muted: "border-transparent bg-text-muted/10 text-text-muted",
  success: "border-transparent bg-success-500/10 text-success-500",
  warning: "border-transparent bg-warning-500/10 text-warning-500",
  danger: "border-transparent bg-danger-500/10 text-danger-500",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = "neutral", mono, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5",
        "text-xs leading-none",
        mono && "font-mono tabular-nums",
        TONE[tone],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

/**
 * The category marker. A dot plus a word — small, not a filled chip
 * (docs/DESIGN_SYSTEM.md §4: mark the category, don't tint the card).
 */
export function CategoryTag({
  category,
  className,
  size = "md",
}: {
  category: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const tokens = categoryTokens(category);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.1em]",
        size === "sm" ? "text-[0.625rem]" : "text-xs",
        tokens.tagText,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-sm", tokens.dot)} aria-hidden />
      {tokens.label}
    </span>
  );
}

/** Ask or Give, set in mono — the platform's one binary distinction. */
export function TypeMark({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const isAsk = type === "ask";
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[0.625rem] uppercase tracking-[0.14em]",
        isAsk ? "text-text-primary-dark" : "text-text-muted",
        className,
      )}
    >
      {isAsk ? "ASK" : "GIVE"}
    </span>
  );
}

export function StatusPill({
  status,
  className,
  showDot = true,
}: {
  status: string;
  className?: string;
  showDot?: boolean;
}) {
  const tokens = statusTokens(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs leading-none",
        tokens.bg,
        tokens.text,
        className,
      )}
    >
      {showDot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", tokens.dot)}
          aria-hidden
        />
      ) : null}
      {tokens.label}
    </span>
  );
}

/** Credit amounts always render mono — one treatment platform-wide. */
export function CreditAmount({
  value,
  className,
  showSuffix = true,
  sign,
}: {
  value: string | number;
  className?: string;
  showSuffix?: boolean;
  sign?: "+" | "−";
}) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        sign === "+" && "text-success-500",
        sign === "−" && "text-text-muted",
        className,
      )}
    >
      {sign}
      {value}
      {showSuffix ? (
        <span className="ml-1 text-[0.7em] text-text-muted">cr</span>
      ) : null}
    </span>
  );
}

export function SkillTag({
  tag,
  category = "skills",
  className,
  onClick,
}: {
  tag: string;
  category?: CategoryKey;
  className?: string;
  onClick?: () => void;
}) {
  const tokens = categoryTokens(category);
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[0.6875rem] lowercase",
        tokens.tagBg,
        tokens.tagText,
        onClick && "transition-opacity hover:opacity-70",
        className,
      )}
    >
      {tag}
    </Comp>
  );
}

export function MetaItem({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-text-muted",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
