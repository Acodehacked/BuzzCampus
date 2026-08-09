"use client";

import Link from "next/link";
import { Clock, TrendingUp } from "lucide-react";
import {
  Badge,
  CATEGORY,
  EmptyState,
  SectionHeading,
  Skeleton,
  Surface,
  cn,
  relativeTime,
} from "@buzz/ui";
import { PIPELINE_LABEL } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

/**
 * Builds admin — the incubation officer's view. The funnel, which projects
 * are gathering momentum, and which have been sitting at "idea" long enough
 * to need a nudge.
 */
export function BuildsConsole() {
  const { data, isLoading } = trpc.admin.builds.useQuery();

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full rounded-md" />;
  }

  const violet = CATEGORY.builds.hex;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading
          title="Pipeline funnel"
          description={`${data.total} projects on record. Each bar counts everything that reached that stage or beyond.`}
        />
        <Surface className="p-5">
          <ul className="space-y-3.5">
            {data.funnel.map((step) => (
              <li key={step.stage}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-text-primary-dark">
                    {PIPELINE_LABEL[step.stage]}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-muted">
                    {step.reached} reached
                    <span className="ml-2 text-text-primary-dark">
                      {step.share}%
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-graphite-700">
                  <div
                    className="h-full rounded-sm transition-[width] duration-500"
                    style={{
                      width: `${step.share}%`,
                      backgroundColor: violet,
                    }}
                  />
                </div>
                {step.atStage > 0 ? (
                  <p className="mt-1 font-mono text-[0.625rem] tabular-nums text-text-muted/70">
                    {step.atStage} sitting here now
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading
            title="Gathering momentum"
            description="Ranked by stage movement, team size and attention — not hand-flagged."
          />
          {data.promising.length === 0 ? (
            <EmptyState title="Nothing to show yet" />
          ) : (
            <Surface className="divide-y divide-graphite-700/70">
              {data.promising.map((build) => (
                <Link
                  key={build.id}
                  href={`/builds/${build.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-graphite-950/40"
                >
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-builds-violet-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary-dark">
                      {build.title}
                    </span>
                    <span className="block truncate text-xs text-text-muted">
                      {build.department ?? "Unassigned"}
                      {build.year ? ` · ${build.year}` : ""}
                    </span>
                  </span>
                  <Badge tone="muted" className="capitalize">
                    {PIPELINE_LABEL[build.pipelineStage]}
                  </Badge>
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-text-primary-dark">
                    {build.momentum}
                  </span>
                </Link>
              ))}
            </Surface>
          )}
        </section>

        <section>
          <SectionHeading
            title="Stalled at idea"
            description="Older than 60 days and still at the first stage."
          />
          {data.stalled.length === 0 ? (
            <EmptyState
              title="Nothing stalled"
              description="Every project on record has moved past the idea stage or is still new."
            />
          ) : (
            <Surface className="divide-y divide-graphite-700/70">
              {data.stalled.map((build) => (
                <Link
                  key={build.id}
                  href={`/builds/${build.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-graphite-950/40",
                  )}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-warning-500" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary-dark">
                    {build.title}
                  </span>
                  {Number(build.openRoles) > 0 ? (
                    <Badge tone="warning" mono>
                      {build.openRoles} unfilled
                    </Badge>
                  ) : null}
                  {build.createdAt ? (
                    <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                      {relativeTime(build.createdAt)}
                    </time>
                  ) : null}
                </Link>
              ))}
            </Surface>
          )}
        </section>
      </div>
    </div>
  );
}
