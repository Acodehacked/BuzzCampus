"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { CATEGORY, cn, relativeTime, type CategoryKey } from "@buzz/ui";
import { revealOnScroll, useGsapContext } from "../../lib/gsap";

export type LivePost = {
  id: string;
  title: string;
  category: string;
  type: string;
  status: string;
  authorName: string;
  locationName?: string | null;
  creditAmount?: string | null;
  createdAt?: Date | string | null;
};

/**
 * The real feed, live from the database, on a violet panel.
 *
 * This is the section that has to be actual data rather than a mock — the
 * claim is "all three categories in one scroll", and a hand-written
 * example proves nothing. If the campus is quiet, it says so.
 */
export function LiveFeedPanel({
  posts,
  stats,
}: {
  posts: LivePost[];
  stats: { rate: number; activeUsers: number } | null;
}) {
  const scope = useRef<HTMLElement>(null);

  useGsapContext(() => {
    revealOnScroll(".live-heading", { y: 30 });
    revealOnScroll(".live-row", {
      y: 24,
      stagger: 0.07,
      trigger: ".live-list",
      start: "top 85%",
    });
    revealOnScroll(".live-stat", {
      y: 30,
      scale: 0.92,
      stagger: 0.1,
      trigger: ".live-stats",
    });
  }, scope);

  return (
    <section
      ref={scope}
      className="pop-panel grain relative overflow-hidden bg-pop-violet text-white"
    >
      <div className="shell-column relative z-10 grid gap-12 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <div>
          <div className="live-heading">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/60">
              right now, on campus
            </p>
            <h2 className="display-xl mt-4 text-4xl text-white sm:text-5xl">
              Not a mockup.
              <br />
              This is the feed.
            </h2>
            <p className="mt-6 max-w-md text-base font-medium leading-relaxed text-white/75">
              Pulled live from the database as this page loaded. Three
              categories, one list, in whatever order the ranking put them.
            </p>
          </div>

          {stats && stats.activeUsers > 0 ? (
            <div className="live-stats mt-10 flex flex-wrap gap-4">
              <div className="live-stat rounded-2xl border-2 border-white/90 bg-white/10 px-5 py-4">
                <p className="font-mono text-4xl font-bold tabular-nums">
                  {stats.rate}%
                </p>
                <p className="mt-1 max-w-[12rem] text-xs leading-relaxed text-white/70">
                  of active people have finished something in two or more
                  categories
                </p>
              </div>
              <div className="live-stat rounded-2xl border-2 border-white/90 bg-white/10 px-5 py-4">
                <p className="font-mono text-4xl font-bold tabular-nums">
                  {stats.activeUsers}
                </p>
                <p className="mt-1 max-w-[12rem] text-xs leading-relaxed text-white/70">
                  people with at least one contribution on record
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="live-list overflow-hidden rounded-2xl border-2 border-ink bg-white text-ink shadow-pop">
          <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em]">
              /feed
            </span>
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-2 w-2 animate-ring-ping rounded-full bg-success-500" />
                <span className="relative h-2 w-2 rounded-full bg-success-500" />
              </span>
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink/50">
                live
              </span>
            </span>
          </div>

          {posts.length === 0 ? (
            <p className="p-8 text-sm leading-relaxed text-ink/60">
              Quiet right now — this campus hasn&apos;t posted anything yet.
              Sign up and you&apos;ll be the first thing on it.
            </p>
          ) : (
            <ul>
              {posts.map((post) => {
                const tokens = CATEGORY[post.category as CategoryKey];
                return (
                  <li
                    key={post.id}
                    className="live-row relative border-b-2 border-ink/10 px-4 py-3.5 last:border-b-0"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-0 h-full w-1",
                        tokens?.edge,
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-2">
                      <span
                        className={cn(
                          "font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em]",
                          post.category === "campus" && "text-campus-ember-600",
                          post.category === "skills" && "text-skills-teal-600",
                          post.category === "builds" && "text-builds-violet-600",
                        )}
                      >
                        {tokens?.label}
                      </span>
                      <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink/45">
                        {post.type}
                      </span>
                      {post.creditAmount && Number(post.creditAmount) > 0 ? (
                        <span className="ml-auto font-mono text-sm font-bold tabular-nums">
                          {post.creditAmount.replace(/\.00$/, "")}
                          <span className="ml-0.5 text-[0.65rem] text-ink/50">
                            cr
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 pl-2 text-sm font-semibold leading-snug">
                      {post.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 pl-2 text-xs text-ink/50">
                      <span>{post.authorName}</span>
                      {post.locationName ? <span>· {post.locationName}</span> : null}
                      {post.createdAt ? (
                        <span className="font-mono">
                          · {relativeTime(post.createdAt)}
                        </span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/register"
            className="group flex items-center justify-between border-t-2 border-ink bg-pop-lime px-4 py-3.5 text-sm font-bold transition-colors hover:bg-pop-lime-deep"
          >
            Join and post your own
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
