"use client";

import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  Badge,
  EmptyState,
  SectionHeading,
  Skeleton,
  StatusPill,
  Surface,
  cn,
  relativeTime,
} from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

/**
 * Campus admin — the staff queue, SLA compliance by urgency, and the
 * recurring-risk flags. The queue is a filtered view of the same `posts`
 * table the public feed reads; there is no separate staff data model.
 */
export function CampusConsole() {
  const { data, isLoading } = trpc.admin.campus.useQuery();

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full rounded-md" />;
  }

  const breached = data.queue.filter((item) => item.breached);

  return (
    <div className="space-y-8">
      {/* SLA compliance by urgency */}
      <section>
        <SectionHeading
          title="SLA compliance"
          description={`High ${data.slaPolicy.high}h · Medium ${data.slaPolicy.medium}h · Low ${data.slaPolicy.low}h from the moment it's reported.`}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {data.byUrgency.map((row) => {
            const total = Number(row.total);
            const resolved = Number(row.resolved);
            const rate = total === 0 ? 0 : Math.round((resolved / total) * 100);
            const breachCount = Number(row.breached);
            return (
              <Surface key={row.urgency} className="p-4">
                <p className="text-xs uppercase tracking-[0.1em] text-text-muted">
                  {row.urgency} urgency
                </p>
                <p className="mt-2 font-mono text-3xl tabular-nums leading-none text-text-primary-dark">
                  {rate}%
                </p>
                <p className="mt-1.5 text-xs text-text-muted">
                  {resolved} of {total} resolved
                </p>
                {breachCount > 0 ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-danger-500">
                    <AlertTriangle className="h-3 w-3" />
                    {breachCount} past its window right now
                  </p>
                ) : null}
              </Surface>
            );
          })}
        </div>
      </section>

      {/* recurring risk — the "smart" feature */}
      <section>
        <SectionHeading
          title="Recurring risk"
          description={`Same place, same kind of problem, ${data.threshold}+ times in ${data.window} days. That's a maintenance failure, not three unrelated reports.`}
        />
        {data.recurring.length === 0 ? (
          <EmptyState
            title="Nothing recurring"
            description="No location has produced the same kind of issue three times this month."
          />
        ) : (
          <Surface className="divide-y divide-graphite-700/70">
            {data.recurring.map((row, index) => (
              <div
                key={`${row.locationName}-${row.issueType}-${index}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary-dark">
                    {row.locationName}
                  </span>
                  <span className="block text-xs capitalize text-text-muted">
                    {row.issueType}
                  </span>
                </span>
                <Badge tone="warning" mono>
                  {row.occurrences}× in {data.window}d
                </Badge>
                {Number(row.stillOpen) > 0 ? (
                  <Badge tone="danger" mono>
                    {row.stillOpen} still open
                  </Badge>
                ) : null}
                {row.lastReportedAt ? (
                  <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                    last {relativeTime(row.lastReportedAt)}
                  </time>
                ) : null}
              </div>
            ))}
          </Surface>
        )}
      </section>

      {/* the queue */}
      <section>
        <SectionHeading
          title="Open queue"
          description={
            breached.length > 0
              ? `${data.queue.length} open · ${breached.length} past their SLA`
              : `${data.queue.length} open, all inside their SLA windows`
          }
        />
        {data.queue.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            description="Nothing open in Campus right now."
          />
        ) : (
          <Surface className="divide-y divide-graphite-700/70">
            {data.queue.map((item) => (
              <Link
                key={item.id}
                href={`/posts/${item.id}`}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-graphite-950/40",
                  item.breached && "bg-danger-500/[0.04]",
                )}
              >
                {item.isAnonymous ? (
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-campus-ember-500" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary-dark">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {item.locationName ?? "No location"}
                    {item.isAnonymous ? " · anonymous" : ` · ${item.authorName}`}
                  </span>
                </span>
                {typeof (item.metadata as Record<string, unknown>)?.urgency ===
                "string" ? (
                  <Badge
                    tone={
                      (item.metadata as Record<string, string>).urgency === "high"
                        ? "danger"
                        : "muted"
                    }
                  >
                    {(item.metadata as Record<string, string>).urgency}
                  </Badge>
                ) : null}
                <StatusPill status={item.status} />
                {item.breached ? (
                  <Badge tone="danger" mono>
                    SLA breached
                  </Badge>
                ) : null}
                {item.createdAt ? (
                  <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                    {relativeTime(item.createdAt)}
                  </time>
                ) : null}
              </Link>
            ))}
          </Surface>
        )}
      </section>
    </div>
  );
}
