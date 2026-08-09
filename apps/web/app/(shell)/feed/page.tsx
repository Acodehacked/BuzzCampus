import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATEGORY, Surface, cn, type CategoryKey } from "@buzz/ui";
import { FeedView } from "../../../components/feed/FeedView";
import { ScarcityRail } from "../../../components/feed/ScarcityRail";
import { FeedTour } from "../../../components/tour/FeedTour";
import { api } from "../../../lib/trpc/server";
import { auth } from "../../../server/auth";

export const metadata = { title: "Feed" };
export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = (["campus", "skills", "builds"] as const).includes(
    params.category as CategoryKey,
  )
    ? (params.category as CategoryKey)
    : undefined;

  const [session, caller] = await Promise.all([auth(), api()]);
  const adoption = await caller.profile.crossCategory().catch(() => null);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <Suspense fallback={null}>
        <FeedTour />
      </Suspense>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl tracking-tight text-text-primary-dark">
            Afternoon, {firstName}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-muted">
            Everything happening on campus, in one list. Ask for a hand, or
            give one — whichever category it happens to be.
          </p>
        </div>

        <FeedView initialCategory={category} />
      </div>

      {/* The rail is context, not navigation — it never duplicates the nav. */}
      <aside className="hidden space-y-4 lg:block">
        <ScarcityRail />

        {adoption && adoption.activeUsers > 0 ? (
          <Surface className="p-4">
            <h2 className="font-display text-sm tracking-tight text-text-primary-dark">
              One habit, not three
            </h2>
            <p className="mt-2 font-mono text-3xl tabular-nums text-text-primary-dark">
              {adoption.rate}%
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              of {adoption.activeUsers} active people have completed something
              in two or more categories.
            </p>
            <Link
              href="/trust"
              className="mt-3 inline-flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-primary-dark"
            >
              See the full picture
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Surface>
        ) : null}

        <Surface className="p-4">
          <h2 className="mb-3 font-display text-sm tracking-tight text-text-primary-dark">
            What goes where
          </h2>
          <ul className="space-y-2.5">
            {(Object.keys(CATEGORY) as CategoryKey[]).map((key) => {
              const tokens = CATEGORY[key];
              return (
                <li key={key} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm", tokens.dot)}
                  />
                  <span>
                    <span className={cn("block text-xs font-medium", tokens.tagText)}>
                      {tokens.label}
                    </span>
                    <span className="block text-xs leading-relaxed text-text-muted">
                      {tokens.blurb}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Surface>
      </aside>
    </div>
    </>
  );
}
