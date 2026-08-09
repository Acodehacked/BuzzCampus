"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { categoryTokens } from "../utils/category";

// ── Surface ────────────────────────────────────────────────────────────
// One bordered surface, used everywhere. 1px border, 10px radius, no
// floating shadow (docs/DESIGN_SYSTEM.md §2 Elevation).

export function Surface({
  className,
  inset,
  ...props
}: HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-graphite-700 bg-graphite-800",
        "light:border-paper-200 light:bg-paper-100",
        inset && "p-4 sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "h-5 w-5 text-[0.625rem]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-14 w-14 text-lg",
  };
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-sm",
        "border border-graphite-700 bg-graphite-950 light:border-paper-200 light:bg-paper-50",
        sizes[size],
        className,
      )}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback className="font-mono font-medium text-text-muted">
        {initials || "?"}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

// ── Separator ──────────────────────────────────────────────────────────

export const Separator = forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-graphite-700 light:bg-paper-200",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

// ── Switch ─────────────────────────────────────────────────────────────

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 items-center rounded-sm border border-graphite-700",
      "bg-graphite-950 transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-muted",
      "data-[state=checked]:border-success-500/50 data-[state=checked]:bg-success-500/20",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-3.5 w-3.5 rounded-[3px] bg-text-muted",
        "transition-transform duration-150 will-change-transform",
        "translate-x-0.5 data-[state=checked]:translate-x-[1.125rem]",
        "data-[state=checked]:bg-success-500",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

// ── RadioGroup ─────────────────────────────────────────────────────────

export const RadioGroup = RadioGroupPrimitive.Root;

/**
 * A full-width selectable card — used by the compose flow's Ask/Give and
 * category pickers, where the choice deserves more than a 16px circle.
 */
export function RadioCard({
  value,
  title,
  description,
  accent,
  icon,
}: {
  value: string;
  title: string;
  description?: string;
  accent?: string;
  icon?: ReactNode;
}) {
  const tokens = accent ? categoryTokens(accent) : null;
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-md border p-3.5 text-left",
        "border-graphite-700 bg-graphite-950/40 transition-colors duration-150",
        "hover:border-text-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-muted",
        "data-[state=checked]:bg-graphite-800",
        tokens
          ? "data-[state=checked]:border-current " + tokens.text
          : "data-[state=checked]:border-text-primary-dark",
      )}
    >
      {icon ? (
        <span
          className={cn(
            "mt-0.5 shrink-0 text-text-muted transition-colors",
            tokens && "group-data-[state=checked]:" + tokens.text,
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text-primary-dark">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <RadioGroupPrimitive.Indicator asChild>
        <span
          className={cn(
            "mt-1 h-2 w-2 shrink-0 rounded-sm",
            tokens ? tokens.dot : "bg-text-primary-dark",
          )}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

// ── Progress ───────────────────────────────────────────────────────────

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <ProgressPrimitive.Root
      value={clamped}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-sm bg-graphite-700",
        className,
      )}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full origin-left bg-text-muted transition-transform duration-300 ease-out",
          barClassName,
        )}
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </ProgressPrimitive.Root>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse-soft rounded-sm bg-graphite-700/60",
        className,
      )}
    />
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-dashed border-graphite-700 p-8",
        "light:border-paper-200",
        className,
      )}
    >
      <p className="text-sm font-medium text-text-primary-dark light:text-text-primary-light">
        {title}
      </p>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

// ── SectionHeading ─────────────────────────────────────────────────────

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-display text-lg tracking-tight text-text-primary-dark light:text-text-primary-light">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
