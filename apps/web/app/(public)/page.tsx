import { HeroPanel } from "../../components/landing/HeroPanel";
import { ConvergePanel } from "../../components/landing/ConvergePanel";
import { HowItWorksPanel } from "../../components/landing/HowItWorksPanel";
import { LiveFeedPanel } from "../../components/landing/LiveFeedPanel";
import { ClosingPanel } from "../../components/landing/ClosingPanel";
import { api } from "../../lib/trpc/server";

export const dynamic = "force-dynamic";

/**
 * The landing page, as five full-bleed panels you scroll through.
 *
 * What it deliberately isn't: a centred headline over two pill buttons and
 * a row of icon-in-a-circle feature cards. The persuading is done by the
 * product itself — a scroll animation that performs the "three tools
 * become one feed" argument, and a section of REAL posts pulled from the
 * database at request time.
 */
export default async function LandingPage() {
  const caller = await api();

  const [feed, platform] = await Promise.all([
    caller.post.feed({ limit: 6, sort: "recent" }).catch(() => ({ items: [] })),
    caller.profile.crossCategory().catch(() => null),
  ]);

  return (
    <>
      <HeroPanel />
      <ConvergePanel />
      <HowItWorksPanel />
      <LiveFeedPanel
        posts={feed.items.map((post) => ({
          id: post.id,
          title: post.title,
          category: post.category,
          type: post.type,
          status: post.status,
          authorName: post.author.name,
          locationName: post.locationName,
          creditAmount: post.creditAmount,
          createdAt: post.createdAt,
        }))}
        stats={
          platform && platform.activeUsers > 0
            ? { rate: platform.rate, activeUsers: platform.activeUsers }
            : null
        }
      />
      <ClosingPanel />
    </>
  );
}
