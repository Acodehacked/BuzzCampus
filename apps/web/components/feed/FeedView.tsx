"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownWideNarrow, Loader2, Search, X } from "lucide-react";
import {
  Button,
  EmptyState,
  FeedFilterChips,
  Input,
  PostCard,
  Skeleton,
  cn,
  type CategoryKey,
} from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

type Sort = "relevance" | "recent" | "urgent";

const SORTS: { value: Sort; label: string; hint: string }[] = [
  { value: "relevance", label: "For you", hint: "Ranked by what's near you and what you can help with" },
  { value: "recent", label: "Newest", hint: "Straight recency, no personalisation" },
  { value: "urgent", label: "Urgent", hint: "High-urgency campus reports first" },
];

/**
 * THE feed. One list, all three categories, mixed by default.
 *
 * The filters narrow this list; they don't switch between three lists. That
 * distinction is the product (docs/PRD.md §3) — a student who opened Buzz
 * to check a Campus report scrolls past a tutoring offer and a project
 * opening on the way, without ever deciding to go look at them.
 */
export function FeedView({
  initialCategory,
}: {
  initialCategory?: CategoryKey;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<CategoryKey | "all">(
    initialCategory ?? "all",
  );
  const [sort, setSort] = useState<Sort>("relevance");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [showMineOnly, setShowMineOnly] = useState(false);

  // Debounce so typing doesn't fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 260);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = trpc.post.feed.useInfiniteQuery(
    {
      category: category === "all" ? undefined : category,
      search: search || undefined,
      sort,
      mine: showMineOnly || undefined,
      limit: 20,
    },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialCursor: 0,
    },
  );

  const { data: counts } = trpc.post.counts.useQuery(undefined, {
    staleTime: 30_000,
  });

  const utils = trpc.useUtils();
  const upvote = trpc.post.upvote.useMutation({
    // Optimistic: the count moves the instant you click it.
    onMutate: async ({ postId }) => {
      await utils.post.feed.cancel();
      const previous = utils.post.feed.getInfiniteData();

      utils.post.feed.setInfiniteData(
        {
          category: category === "all" ? undefined : category,
          search: search || undefined,
          sort,
          mine: showMineOnly || undefined,
          limit: 20,
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === postId
                  ? {
                      ...item,
                      hasUpvoted: !item.hasUpvoted,
                      upvoteCount: item.hasUpvoted
                        ? Math.max(0, item.upvoteCount - 1)
                        : item.upvoteCount + 1,
                    }
                  : item,
              ),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        utils.post.feed.setInfiniteData({ limit: 20 }, context.previous);
      }
      void utils.post.feed.invalidate();
    },
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  // Infinite scroll via an intersection sentinel — no "load more" button to
  // interrupt the scroll.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const onCategoryChange = useCallback(
    (next: CategoryKey | "all") => {
      setCategory(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("category");
      else params.set("category", next);
      router.replace(`/feed${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const activeSort = SORTS.find((s) => s.value === sort)!;

  return (
    <section aria-label="Campus feed">
      {/* Controls: one filter row, one sort, one search. Not a toolbar. */}
      <div className="sticky top-14 z-20 -mx-4 mb-1 border-b border-graphite-700 bg-graphite-950/95 px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div data-tour="feed-filters">
          <FeedFilterChips
            value={category}
            onChange={onCategoryChange}
            counts={counts}
          />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search the feed"
                aria-label="Search the feed"
                className="h-8 w-40 pl-8 pr-7 text-xs focus:w-56"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary-dark"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>

            <div
              data-tour="feed-sort"
              className="flex items-center rounded-sm border border-graphite-700"
            >
              {SORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.hint}
                  onClick={() => setSort(option.value)}
                  className={cn(
                    "px-2 py-1 text-xs transition-colors first:rounded-l-sm last:rounded-r-sm",
                    sort === option.value
                      ? "bg-graphite-800 text-text-primary-dark"
                      : "text-text-muted hover:text-text-primary-dark",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMineOnly((v) => !v)}
              className={cn(
                "rounded-sm border px-2 py-1 text-xs transition-colors",
                showMineOnly
                  ? "border-transparent bg-graphite-800 text-text-primary-dark"
                  : "border-graphite-700 text-text-muted hover:text-text-primary-dark",
              )}
            >
              Mine
            </button>
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted/70">
          <ArrowDownWideNarrow className="h-3 w-3" />
          {activeSort.hint}
        </p>
      </div>

      {query.isLoading ? (
        <FeedSkeleton />
      ) : query.isError ? (
        // A failed query must never render as "the feed is empty" — that
        // reads as a working app with no content and hides real breakage.
        <EmptyState
          className="mt-6 border-danger-500/40"
          title="Couldn't load the feed"
          description={query.error.message}
          action={
            <Button
              variant="quiet"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={
            search
              ? `Nothing matches "${search}"`
              : showMineOnly
                ? "You haven't posted anything yet"
                : "The feed is empty"
          }
          description={
            search
              ? "Try a different word, or clear the search to see everything."
              : "Post the first Ask or Give — a broken tap, an hour of tutoring, a teammate you need."
          }
          action={
            <Button asChild variant="primary" size="sm">
              <a href="/post/new">Post something</a>
            </Button>
          }
        />
      ) : (
        <div data-tour="feed-list" className="-mx-4 sm:-mx-5">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              href={`/posts/${post.id}`}
              hasUpvoted={post.hasUpvoted}
              onUpvote={() => upvote.mutate({ postId: post.id })}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-px" aria-hidden />

      {isFetchingNextPage ? (
        <p className="flex items-center justify-center gap-2 py-6 text-xs text-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading more
        </p>
      ) : !hasNextPage && items.length > 0 ? (
        <p className="py-8 text-center text-xs text-text-muted/60">
          That&apos;s everything.
        </p>
      ) : null}
    </section>
  );
}

function FeedSkeleton() {
  return (
    <div className="-mx-4 divide-y divide-graphite-700/70 sm:-mx-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-4 py-4 pl-4 sm:pl-5">
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
