import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import {
  BuildCard,
  CATEGORY,
  CategoryTag,
  EmptyState,
  StatusPill,
  Surface,
  cn,
  relativeTime,
  type CategoryKey,
} from "@buzz/ui";
import { ProfileHero } from "../../../../components/profile/ProfileHero";
import { api } from "../../../../lib/trpc/server";
import { auth } from "../../../../server/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const caller = await api();
    const profile = await caller.profile.byId({ id });
    return { title: profile.user.name };
  } catch {
    return { title: "Profile" };
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = await api();
  const session = await auth();

  const profile = await caller.profile.byId({ id }).catch(() => null);
  if (!profile) notFound();

  const projects = await caller.build.byUser({ userId: id }).catch(() => []);
  const isSelf = session?.user?.id === id;

  return (
    <div className="space-y-8">
      <ProfileHero
        name={profile.user.name}
        department={profile.user.department}
        role={profile.user.role}
        joined={
          profile.user.createdAt
            ? `joined ${relativeTime(profile.user.createdAt)}`
            : null
        }
        isSelf={isSelf}
        score={profile.score}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-8">
          {/* Where they actually show up. Three cards rather than a table:
              the point is the comparison between categories, not the
              precise counts. */}
          {profile.activity.length > 0 ? (
            <section>
              <SectionTitle>Where they show up</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(CATEGORY) as CategoryKey[]).map((key) => {
                  const row = profile.activity.find((a) => a.category === key);
                  const tokens = CATEGORY[key];
                  const posted = Number(row?.posted ?? 0);
                  const completed = Number(row?.completed ?? 0);

                  return (
                    <div
                      key={key}
                      className={cn(
                        "relative overflow-hidden rounded-xl border border-graphite-700 bg-graphite-800 p-4",
                        posted === 0 && "opacity-45",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-0 h-full w-1",
                          tokens.edge,
                        )}
                      />
                      <CategoryTag category={key} size="sm" />
                      <p className="mt-3 font-mono text-3xl font-bold tabular-nums leading-none text-text-primary-dark">
                        {completed}
                      </p>
                      <p className="mt-1.5 text-xs text-text-muted">
                        completed of{" "}
                        <span className="font-mono tabular-nums">{posted}</span>{" "}
                        posted
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle>Posts</SectionTitle>
            {profile.recentPosts.length === 0 ? (
              <EmptyState
                title="Nothing posted yet"
                description="Asks and Gives across all three categories show up here."
              />
            ) : (
              <Surface className="divide-y divide-graphite-700/70 overflow-hidden">
                {profile.recentPosts.map((post) => {
                  const tokens = CATEGORY[post.category as CategoryKey];
                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="group relative flex flex-wrap items-center gap-3 py-3 pl-5 pr-4 transition-colors hover:bg-graphite-950/40"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-0 h-full w-1 opacity-70 transition-opacity group-hover:opacity-100",
                          tokens?.edge,
                        )}
                      />
                      <CategoryTag category={post.category} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary-dark">
                        {post.title}
                      </span>
                      <StatusPill status={post.status} />
                      {post.createdAt ? (
                        <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                          {relativeTime(post.createdAt)}
                        </time>
                      ) : null}
                    </Link>
                  );
                })}
              </Surface>
            )}
          </section>

          {projects.length > 0 ? (
            <section>
              <SectionTitle>Projects</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((build) => (
                  <BuildCard
                    key={build.id}
                    build={{ ...build, tags: build.tags ?? [] }}
                    href={`/builds/${build.id}`}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          {profile.reviews.length > 0 ? (
            <Surface className="p-5">
              <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.1em] text-text-muted">
                What people said
              </h2>
              <ul className="space-y-4">
                {profile.reviews.map((review) => (
                  <li
                    key={review.id}
                    className="border-b border-graphite-700/70 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={cn(
                            "h-3.5 w-3.5",
                            index < review.rating
                              ? "fill-warning-500 text-warning-500"
                              : "text-graphite-600",
                          )}
                        />
                      ))}
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-relaxed text-text-primary-dark">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-xs text-text-muted">
                      {review.reviewerName}
                    </p>
                  </li>
                ))}
              </ul>
            </Surface>
          ) : (
            <Surface className="p-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.1em] text-text-muted">
                No reviews yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                Reviews arrive after a post is verified — they nudge the Buzz
                Score up or down by up to 10%.
              </p>
            </Surface>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.1em] text-text-muted">
      {children}
    </h2>
  );
}
