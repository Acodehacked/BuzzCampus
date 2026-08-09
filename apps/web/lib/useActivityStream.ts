"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "./trpc/client";

export type StreamItem = {
  id: string;
  postId?: string | null;
  title: string;
  category: string;
  toStatus?: string | null;
  createdAt?: string | Date | null;
};

/**
 * Subscribes to /api/events and keeps the shell's activity pulse fed.
 *
 * Two jobs:
 *   1. surface what's happening (the pulse + its tooltip list)
 *   2. invalidate the feed query when something actually changed, so the
 *      list updates without polling it every few seconds
 *
 * If EventSource can't connect, the seeded data from the server render
 * still shows and the pulse simply reads "idle" — the app never depends on
 * the stream being up.
 */
export function useActivityStream(seed: StreamItem[] = []) {
  const [items, setItems] = useState<StreamItem[]>(seed);
  const [live, setLive] = useState(false);
  const queryClient = useQueryClient();
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: initial } = trpc.account.activity.useQuery(
    { limit: 8 },
    { staleTime: 60_000 },
  );

  useEffect(() => {
    if (initial && initial.length > 0) {
      setItems(
        initial.map((row) => ({
          id: row.id,
          postId: row.postId,
          title: row.title,
          category: row.category,
          toStatus: row.toStatus,
          createdAt: row.createdAt,
        })),
      );
    }
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) return;

    const source = new EventSource("/api/events");

    source.addEventListener("ready", () => setLive(true));

    source.addEventListener("activity", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as StreamItem;
        if (!payload?.title) return;

        setItems((current) => {
          if (current.some((item) => item.id === payload.id)) return current;
          return [payload, ...current].slice(0, 12);
        });

        // Coalesce bursts — a batch of transitions shouldn't fire ten
        // refetches in a second.
        if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
        invalidateTimer.current = setTimeout(() => {
          void queryClient.invalidateQueries({
            queryKey: getQueryKey(trpc.post.feed),
          });
          void queryClient.invalidateQueries({
            queryKey: getQueryKey(trpc.post.counts),
          });
        }, 600);
      } catch {
        // A malformed frame is not worth breaking the stream over.
      }
    });

    source.onerror = () => {
      setLive(false);
      // EventSource reconnects on its own; nothing to do but reflect it.
    };

    return () => {
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
      source.close();
      setLive(false);
    };
  }, [queryClient]);

  return { items, live };
}
