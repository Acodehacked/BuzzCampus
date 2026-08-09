import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Button,
  CATEGORY,
  CategoryTag,
  CreditAmount,
  Honeycomb,
  StatusPill,
  TypeMark,
  cn,
  relativeTime,
  type CategoryKey,
} from "@buzz/ui";
import { api } from "../../lib/trpc/server";

export const dynamic = "force-dynamic";

/**
 * The landing page.
 *
 * Note what this deliberately is not (docs/DESIGN_SYSTEM.md §3): no
 * centered giant headline over two pill buttons, no three-column icon
 * feature grid, no gradient behind the type. The layout is asymmetric, and
 * the thing doing the persuading is the actual live feed — real posts from
 * all three categories in one scroll, which is the entire product claim
 * demonstrated rather than asserted.
 */
export default async function LandingPage() {
  const caller = await api();

  const [feed, platform, campus] = await Promise.all([
    caller.post.feed({ limit: 6, sort: "recent" }).catch(() => ({ items: [] })),
    caller.trust.platform().catch(() => null),
    caller.trust.campus().catch(() => null),
  ]);

  return (
    <>
      {/* ── hero ── the one sanctioned tint on the whole site */}
      <section className="hero-tint border-b border-paper-200">
        <div className="shell-column grid items-center gap-12 py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:py-28">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
              One feed · three categories · one habit
            </p>

            <h1 className="mt-5 text-4xl leading-[1.08] tracking-tight text-text-primary-light sm:text-5xl">
              Ask for help.
              <br />
              Give a hand.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-text-muted">
              A broken AC in Block C. An hour of tutoring. A project missing an
              embedded-systems person. On Buzz these are the same kind of post
              — an <strong className="font-medium text-text-primary-light">Ask</strong>{" "}
              or a <strong className="font-medium text-text-primary-light">Give</strong>{" "}
              — in one shared feed, with one wallet and one score behind them.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/register">
                  Join with your campus email
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="quiet" size="lg">
                <Link href="/trust">See what campus actually fixed</Link>
              </Button>
            </div>
          </div>

          {/* signature moment 1 — the honeycomb, here and nowhere else */}
          <div className="hidden justify-self-center lg:block">
            <Honeycomb size={200} />
          </div>
        </div>
      </section>

      {/* ── the live feed, doing the arguing ── */}
      <section className="shell-column py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div>
            <h2 className="text-2xl leading-tight tracking-tight text-text-primary-light">
              Three problems that never talk to each other. One list that does.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Build this as three separate tools and most people only ever open
              one of them. Build it as one feed and a student who came to check
              a maintenance report scrolls past a tutoring offer and a project
              opening on the way — without ever deciding to go look.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              That&apos;s not a claim about the interface. It&apos;s the same
              database table, the same lifecycle, and the same ranked list.
            </p>

            <ul className="mt-8 space-y-4">
              {(Object.keys(CATEGORY) as CategoryKey[]).map((key) => {
                const tokens = CATEGORY[key];
                return (
                  <li key={key} className="flex gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-sm",
                        tokens.dot,
                      )}
                    />
                    <span>
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          tokens.tagText,
                        )}
                      >
                        {tokens.label}
                      </span>
                      <span className="block text-sm leading-relaxed text-text-muted">
                        {tokens.blurb}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* the real feed, live, mixed */}
          <div className="rounded-md border border-paper-200 bg-paper-100">
            <div className="flex items-center justify-between border-b border-paper-200 px-4 py-2.5">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-text-muted">
                /feed — live
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success-500"
                />
                <span className="font-mono text-[0.6875rem] text-text-muted">
                  now
                </span>
              </span>
            </div>

            {feed.items.length === 0 ? (
              <p className="p-8 text-sm leading-relaxed text-text-muted">
                The feed is empty right now — seed the database, or sign up and
                post the first Ask.
              </p>
            ) : (
              <ul className="divide-y divide-paper-200">
                {feed.items.map((post) => {
                  const tokens = CATEGORY[post.category as CategoryKey];
                  return (
                    <li key={post.id} className="relative">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-0 h-full w-[2px] opacity-70",
                          tokens.edge,
                        )}
                      />
                      <div className="py-3.5 pl-4 pr-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <CategoryTag category={post.category} size="sm" />
                          <TypeMark type={post.type} />
                          <StatusPill status={post.status} />
                          {post.creditAmount && Number(post.creditAmount) > 0 ? (
                            <CreditAmount
                              value={post.creditAmount.replace(/\.00$/, "")}
                              className="ml-auto text-sm text-text-primary-light"
                            />
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-sm leading-snug text-text-primary-light">
                          {post.title}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                          <span>{post.author.name}</span>
                          {post.locationName ? (
                            <span>· {post.locationName}</span>
                          ) : null}
                          {post.createdAt ? (
                            <time className="font-mono tabular-nums">
                              · {relativeTime(post.createdAt)}
                            </time>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t border-paper-200 px-4 py-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary-light"
              >
                Join to post and respond
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── the numbers, where numbers are actually the point ── */}
      {platform && platform.adoption.activeUsers > 0 ? (
        <section className="border-y border-paper-200 bg-paper-100">
          <div className="shell-column grid gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-muted">
                The number that matters
              </p>
              <p className="mt-4 font-mono text-6xl tabular-nums leading-none text-text-primary-light">
                {platform.adoption.rate}%
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-muted">
                of active people have completed something in{" "}
                <strong className="font-medium text-text-primary-light">
                  two or more categories
                </strong>
                . If Buzz were three tools wearing a trench coat, this number
                would be close to zero.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-6 self-center">
              {campus ? (
                <>
                  <div>
                    <dt className="text-xs text-text-muted">
                      Campus issues resolved
                    </dt>
                    <dd className="mt-1 font-mono text-2xl tabular-nums text-text-primary-light">
                      {campus.resolutionRate}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">
                      Median time to fix
                    </dt>
                    <dd className="mt-1 font-mono text-2xl tabular-nums text-text-primary-light">
                      {campus.medianHours}h
                    </dd>
                  </div>
                </>
              ) : null}
              {platform.totals.map((row) => (
                <div key={row.category}>
                  <dt className="text-xs capitalize text-text-muted">
                    {row.category} posts
                  </dt>
                  <dd className="mt-1 font-mono text-2xl tabular-nums text-text-primary-light">
                    {row.total}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {/* ── the architecture, stated plainly ── */}
      <section className="shell-column py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl leading-tight tracking-tight text-text-primary-light">
              One table, not three domains
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              A maintenance report, a tutoring session and a vacant seat on a
              startup team are the same row in the same table, differentiated
              by a category and a JSON blob. They walk the same status graph
              and leave the same audit trail.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              That&apos;s why the wallet, the score and the feed can be
              genuinely shared instead of three things stapled together.
            </p>
          </div>

          <pre className="overflow-x-auto rounded-md border border-paper-200 bg-paper-100 p-5 font-mono text-xs leading-relaxed text-text-primary-light">
{`posts
  id          uuid
  type        ask | give
  category    campus | skills | builds
  status      open → accepted → in_progress
              → fulfilled → verified
  metadata    jsonb   -- the only thing that
                      -- varies by category

post_events   -- one audit trail, append-only
ledger_entries -- one ledger, every category
contribution_events -- one Buzz Score`}
          </pre>
        </div>
      </section>
    </>
  );
}
