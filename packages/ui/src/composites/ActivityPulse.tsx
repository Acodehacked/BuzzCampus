"use client";

import { cn } from "../utils/cn";
import { categoryTokens } from "../utils/category";
import { TooltipContent, TooltipTrigger } from "../primitives/Tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { relativeTime } from "../utils/time";

/**
 * The live-activity pulse — docs/DESIGN_SYSTEM.md §5, signature moment 2.
 *
 * A quiet dot in the shell nav that brightens when something happens
 * anywhere on the platform. Not a badge with a count, not a red alert —
 * the point is that the name is *felt*: something is always going on here.
 * It brightens on new activity and settles back on its own.
 */

export type ActivityItem = {
  id: string;
  title: string;
  category: string;
  toStatus?: string | null;
  createdAt?: Date | string | null;
};

export function ActivityPulse({
  items,
  live,
  className,
}: {
  items: ActivityItem[];
  /** true while the SSE stream is connected */
  live?: boolean;
  className?: string;
}) {
  const latest = items[0];
  const tokens = categoryTokens(latest?.category);

  return (
    <TooltipPrimitive.Root delayDuration={120}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={
            live ? "Live campus activity" : "Campus activity (reconnecting)"
          }
          className={cn(
            "group inline-flex items-center gap-2 rounded-sm px-2 py-1",
            "transition-colors duration-150 hover:bg-graphite-800",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-muted",
            className,
          )}
        >
          <span className="relative flex h-2 w-2 items-center justify-center">
            {live ? (
              <span
                aria-hidden
                className={cn(
                  "absolute h-2 w-2 animate-pulse-soft rounded-full opacity-60",
                  tokens.dot,
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative h-1.5 w-1.5 rounded-full transition-colors duration-500",
                live ? tokens.dot : "bg-text-muted/40",
              )}
            />
          </span>
          <span className="hidden font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-text-muted sm:inline">
            {live ? "live" : "idle"}
          </span>
        </button>
      </TooltipTrigger>

      <TooltipContent side="bottom" align="end" className="w-72 p-0">
        <p className="border-b border-graphite-700 px-3 py-2 text-[0.6875rem] uppercase tracking-[0.1em] text-text-muted">
          Happening on campus
        </p>
        {items.length === 0 ? (
          <p className="px-3 py-3 text-xs text-text-muted">
            Quiet right now. That won&apos;t last.
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto py-1">
            {items.slice(0, 6).map((item) => {
              const itemTokens = categoryTokens(item.category);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-2 px-3 py-1.5 text-xs"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-sm",
                      itemTokens.dot,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-text-primary-dark">
                      {item.title}
                    </span>
                    <span className="text-text-muted">
                      {(item.toStatus ?? "").replace(/_/g, " ")}
                      {item.createdAt ? (
                        <span className="ml-1.5 font-mono opacity-70">
                          {relativeTime(item.createdAt)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}
