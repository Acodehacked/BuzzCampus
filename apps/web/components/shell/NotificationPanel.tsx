"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import type { ReactNode } from "react";
import { categoryTokens, cn, relativeTime } from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

type NotificationItem = {
  id: string;
  kind: "event" | "response" | "credit";
  postId: string | null;
  category: string | null;
  title: string;
  body: string;
  createdAt: Date | string;
};

/**
 * The unified notification centre. Everything here is derived from the
 * shared audit trail rather than a notifications table — the same
 * postEvents rows that render the lifecycle timeline.
 */
export function NotificationPanel({
  items,
  children,
}: {
  items: NotificationItem[];
  children: ReactNode;
}) {
  const { data: digest } = trpc.account.digest.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-[22rem] overflow-hidden rounded-md border border-graphite-700",
            "bg-graphite-800 shadow-tight",
            "data-[state=open]:animate-fade-in-0",
          )}
        >
          {/* The digest sits above the notifications on purpose: one item
              per category is the cross-category nudge, and burying it under
              your own activity defeats the point (docs/PRD.md §6.4 #5). */}
          {digest && digest.length > 0 ? (
            <div className="border-b border-graphite-700 bg-graphite-950/40 p-3">
              <p className="mb-2 text-[0.6875rem] uppercase tracking-[0.1em] text-text-muted">
                Today, across campus
              </p>
              <ul className="space-y-1.5">
                {digest.map((item) => {
                  const tokens = categoryTokens(item.category);
                  return (
                    <li key={item.postId}>
                      <Popover.Close asChild>
                        <Link
                          href={`/posts/${item.postId}`}
                          className="group flex items-start gap-2 rounded-sm p-1 transition-colors hover:bg-graphite-800"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm",
                              tokens.dot,
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs text-text-primary-dark">
                              {item.title}
                            </span>
                            <span className="text-[0.6875rem] text-text-muted">
                              {item.reason}
                            </span>
                          </span>
                        </Link>
                      </Popover.Close>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-xs leading-relaxed text-text-muted">
                Nothing yet. Post an Ask or offer to help with something and
                this fills up.
              </p>
            ) : (
              <ul className="divide-y divide-graphite-700/70">
                {items.map((item) => {
                  const tokens = categoryTokens(item.category);
                  const body = (
                    <>
                      <span className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm",
                            item.category ? tokens.dot : "bg-text-muted",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-text-primary-dark">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[0.6875rem] leading-relaxed text-text-muted">
                            {item.body}
                          </span>
                          <span className="mt-0.5 block font-mono text-[0.625rem] text-text-muted/70">
                            {relativeTime(item.createdAt)}
                          </span>
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.postId ? (
                        <Popover.Close asChild>
                          <Link
                            href={`/posts/${item.postId}`}
                            className="block p-3 transition-colors hover:bg-graphite-950/40"
                          >
                            {body}
                          </Link>
                        </Popover.Close>
                      ) : (
                        <div className="p-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
