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
// Dark mode is the app shell; light mode is the public pages. Every
// variant needs BOTH treatments — a primary button that only sets its
// light-mode background inherits the dark-mode text colour and ends up
// black on black (docs/DESIGN_SYSTEM.md §6).
const VARIANTS: Record<Variant, string> = {
  primary:
    "border border-transparent bg-text-primary-dark text-graphite-950 hover:bg-white " +
    "focus-visible:ring-text-primary-dark " +
    "light:bg-graphite-950 light:text-paper-50 light:hover:bg-graphite-800",
  secondary:
    "bg-graphite-800 text-text-primary-dark border border-graphite-700 hover:border-text-muted/60 " +
    "hover:bg-graphite-700 focus-visible:ring-text-muted " +
    "light:bg-paper-100 light:text-text-primary-light light:border-paper-200 light:hover:bg-paper-50",
  ghost:
    "bg-transparent text-text-muted border border-transparent hover:text-text-primary-dark " +
    "hover:bg-graphite-800 focus-visible:ring-text-muted " +
    "light:hover:text-text-primary-light light:hover:bg-paper-200/60",
  quiet:
    "bg-transparent text-text-muted border border-graphite-700 hover:text-text-primary-dark " +
    "hover:border-text-muted/60 focus-visible:ring-text-muted " +
    "light:border-paper-200 light:hover:text-text-primary-light",
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

    // Radix's Slot requires exactly ONE child, so with asChild we pass the
    // child straight through — no spinner wrapper, and no stray `null`
    // sibling from a false branch (which also counts as a second child).
    // asChild is for links, which don't have a pending state anyway.
    const content = asChild ? (
      children
    ) : (
      <>
        {loading ? (
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-t-transparent"
          />
        ) : null}
        {children}
      </>
    );

    return (
      <Comp
        ref={ref}
        {...(asChild ? {} : { disabled: disabled || loading })}
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
        {content}
      </Comp>
    );
  },
);

Button.displayName = "Button";
