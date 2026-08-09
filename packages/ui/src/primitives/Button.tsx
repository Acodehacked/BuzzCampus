"use client";

import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { categoryTokens, type CategoryKey } from "../utils/category";

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /**
   * Tints the button with a category accent. Only for actions *inside* a
   * category flow — docs/DESIGN_SYSTEM.md §4. Global actions (+ Post, nav,
   * shared-screen CTAs) stay neutral.
   */
  category?: CategoryKey;
  asChild?: boolean;
  loading?: boolean;
}

// Flat, 1px-bordered, 6px radius. No shadow-sm, no bg-card, no rounded-md
// default — the shadcn silhouette is banned outright (CLAUDE.md Rule 1).
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-text-primary-dark text-graphite-950 hover:bg-white border border-transparent " +
    "light:bg-graphite-950 focus-visible:ring-text-primary-dark",
  secondary:
    "bg-graphite-800 text-text-primary-dark border border-graphite-700 hover:border-text-muted/60 " +
    "hover:bg-graphite-700 focus-visible:ring-text-muted",
  ghost:
    "bg-transparent text-text-muted border border-transparent hover:text-text-primary-dark " +
    "hover:bg-graphite-800 focus-visible:ring-text-muted",
  quiet:
    "bg-transparent text-text-muted border border-graphite-700 hover:text-text-primary-dark " +
    "hover:border-text-muted/60 focus-visible:ring-text-muted",
  danger:
    "bg-transparent text-danger-500 border border-danger-500/40 hover:bg-danger-500/10 " +
    "focus-visible:ring-danger-500",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  icon: "h-9 w-9 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      category,
      asChild,
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const categoryStyle =
      category && variant === "primary" ? categoryTokens(category).button : null;

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center rounded-sm font-medium tracking-tight",
          "transition-[background-color,border-color,color] duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0",
          "disabled:pointer-events-none disabled:opacity-40",
          "whitespace-nowrap select-none",
          SIZES[size],
          categoryStyle ?? VARIANTS[variant],
          loading && "cursor-progress",
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-t-transparent"
          />
        ) : null}
        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";
