import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Star } from "lucide-react";
import {
  Avatar,
  Badge,
  BuildCard,
  Button,
  CategoryTag,
  EmptyState,
  SectionHeading,
  StatusPill,
  Surface,
  cn,
  relativeTime,
} from "@buzz/ui";
import { BuzzScoreCard } from "../../../../components/profile/BuzzScoreCard";
import { api } from "../../../../lib/trpc/server";
import { auth } from "../../../../server/auth";

export const dynamic = "force-dynamic";

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <header className="flex flex-wrap items-start gap-4">
          <Avatar name={profile.user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl tracking-tight text-text-primary-dark">
              {profile.user.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
              {profile.user.department ? (
                <span>{profile.user.department}</span>
              ) : null}
              <Badge tone="muted" className="capitalize">
                {profile.user.role}
              </Badge>
              {profile.user.createdAt ? (
                <span className="font-mono text-xs tabular-nums">
                  joined {relativeTime(profile.user.createdAt)}
                </span>
              ) : null}
            </p>
          </div>
          {isSelf ? (
            <Button asChild variant="quiet" size="sm">
              <Link href="/profile/export">
                <FileText className="h-3.5 w-3.5" />
                Export contributions
              </Link>
            </Button>
          ) : null}
        </header>

        {/* Activity by category — the honest answer to "does this person
            actually use more than one part of the platform". */}
        {profile.activity.length > 0 ? (
          <section className="mt-8">
            <SectionHeading title="Activity" />
            <Surface className="divide-y divide-graphite-700/70">
              {profile.activity.map((row) => (
                <div
                  key={row.category}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <CategoryTag category={row.category} />
                  <span className="flex items-center gap-5 text-xs text-text-muted">
                    <span>
                      <span className="font-mono tabular-nums text-text-primary-dark">
                        {row.posted}
                      </span>{" "}
                      posted
                    </span>
                    <span>
                      <span className="font-mono tabular-nums text-success-500">
                        {row.completed}
                      </span>{" "}
                      completed
                    </span>
                  </span>
                </div>
              ))}
            </Surface>
          </section>
        ) : null}

        <section className="mt-8">
          <SectionHeading title="Posts" />
          {profile.recentPosts.length === 0 ? (
            <EmptyState
              title="Nothing posted yet"
              description="Asks and Gives across all three categories show up here."
            />
          ) : (
            <Surface className="divide-y divide-graphite-700/70">
              {profile.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-graphite-950/40"
                >
                  <CategoryTag category={post.category} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary-dark">
                    {post.title}
                  </span>
                  <StatusPill status={post.status} />
                  {post.createdAt ? (
                    <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                      {relativeTime(post.createdAt)}
                    </time>
                  ) : null}
                </Link>
              ))}
            </Surface>
          )}
        </section>

        {projects.length > 0 ? (
          <section className="mt-8">
            <SectionHeading title="Projects" />
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
        <BuzzScoreCard score={profile.score} />

        {profile.reviews.length > 0 ? (
          <Surface className="p-4">
            <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted">
              What people said
            </h2>
            <ul className="space-y-3">
              {profile.reviews.map((review) => (
                <li key={review.id} className="border-b border-graphite-700/70 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          "h-3 w-3",
                          index < review.rating
                            ? "fill-warning-500 text-warning-500"
                            : "text-text-muted/30",
                        )}
                      />
                    ))}
                  </div>
                  {review.comment ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  ) : null}
                  <p className="mt-1 text-[0.6875rem] text-text-muted/60">
                    {review.reviewerName}
                  </p>
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}
      </aside>
    </div>
  );
}
