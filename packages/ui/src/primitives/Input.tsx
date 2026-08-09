"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../utils/cn";

const FIELD_BASE =
  "w-full rounded-sm bg-graphite-950 border border-graphite-700 text-text-primary-dark " +
  "placeholder:text-text-muted/60 transition-colors duration-150 " +
  "focus:outline-none focus:border-text-muted focus:ring-1 focus:ring-text-muted/40 " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** renders in the mono face — post IDs, amounts, codes */
  mono?: boolean;
  /** a static adornment inside the field (a unit, a `@`, a currency mark).
   *  Named `leading` rather than `prefix` because the DOM's own `prefix`
   *  attribute is a string and would clash. */
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, mono, leading, ...props }, ref) => {
    if (leading) {
      return (
        <div
          className={cn(
            FIELD_BASE,
            "flex h-9 items-center gap-2 px-3 focus-within:border-text-muted",
            invalid && "border-danger-500/60",
            className,
          )}
        >
          <span className="shrink-0 text-xs text-text-muted">{leading}</span>
          <input
            ref={ref}
            className={cn(
              "h-full w-full bg-transparent text-sm outline-none placeholder:text-text-muted/60",
              mono && "font-mono tabular-nums",
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          FIELD_BASE,
          "h-9 px-3 text-sm",
          mono && "font-mono tabular-nums",
          invalid && "border-danger-500/60 focus:border-danger-500",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        FIELD_BASE,
        "min-h-[92px] resize-y px-3 py-2 text-sm leading-relaxed",
        invalid && "border-danger-500/60 focus:border-danger-500",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Label = forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-xs font-medium uppercase tracking-[0.08em] text-text-muted",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="ml-1 text-campus-ember-500" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        {hint ? (
          <span className="text-xs text-text-muted/70">{hint}</span>
        ) : null}
      </div>
      {children(id)}
      {error ? (
        <p role="alert" className="text-xs text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
