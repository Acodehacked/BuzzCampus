"use client";

import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { categoryTokens, type CategoryKey } from "../utils/category";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "quiet"
  | "danger"
  /** the loud one: solid ink pill with a hard offset — entry surfaces */
  | "pop"
  /** inverse of pop, for sitting on a dark panel */
  | "pop-light";

type Size = "sm" | "md" | "lg" | "xl" | "icon";

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

// Dark mode is the app shell; light mode is the public pages. Every
// variant needs BOTH treatments — a primary button that only sets its
// light-mode background inherits the dark-mode text colour and ends up
// black on black.
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

  // The reference's signature control: a solid pill that sits on a
  // saturated panel, with a hard black offset instead of a soft blur, and
  // a press that actually moves it into the shadow.
  pop:
    "rounded-full border-2 border-ink bg-ink text-white shadow-pop " +
    "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_rgb(11_13_16)] " +
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none " +
    "focus-visible:ring-ink",
  "pop-light":
    "rounded-full border-2 border-white bg-white text-ink shadow-pop-light " +
    "hover:-translate-x-[1px] hover:-translate-y-[1px] " +
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none " +
    "focus-visible:ring-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  xl: "h-14 px-8 text-base gap-2.5 font-semibold",
  icon: "h-9 w-9 justify-center",
};

const POP_SIZES: Partial<Record<Size, string>> = {
  sm: "h-9 px-4 text-xs gap-1.5 font-semibold",
  md: "h-11 px-6 text-sm gap-2 font-semibold",
  lg: "h-13 px-8 text-base gap-2 font-semibold",
  xl: "h-16 px-10 text-lg gap-3 font-bold",
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
    const isPop = variant === "pop" || variant === "pop-light";
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
            className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
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
          "inline-flex items-center font-medium tracking-tight",
          "transition-all duration-150 ease-spring will-change-transform",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-transparent",
          "disabled:pointer-events-none disabled:opacity-40",
          "whitespace-nowrap select-none",
          isPop ? "rounded-full" : "rounded-sm",
          (isPop ? (POP_SIZES[size] ?? SIZES[size]) : SIZES[size]),
          categoryStyle ?? VARIANTS[variant],
          // Non-pop buttons still get a small press, so every control on
          // the platform feels like the same physical object.
          !isPop && "active:scale-[0.97]",
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
