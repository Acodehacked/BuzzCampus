// packages/core/sla.ts — Campus SLA maths (docs/PRD.md §6.1 #2).

import { CAMPUS_SLA_HOURS } from "./constants";
import type { Post, PostMetadata, PostStatus } from "@buzz/db";

export type SlaState = {
  hours: number;
  dueAt: Date;
  msRemaining: number;
  breached: boolean;
  /** 0 → just posted, 1 → deadline reached */
  elapsedFraction: number;
  severity: "ok" | "warning" | "breached";
};

export function slaHoursFor(metadata: PostMetadata | null | undefined): number {
  if (metadata?.slaHours && Number.isFinite(metadata.slaHours)) {
    return Number(metadata.slaHours);
  }
  const urgency = metadata?.urgency ?? "medium";
  return CAMPUS_SLA_HOURS[urgency] ?? CAMPUS_SLA_HOURS.medium;
}

/**
 * Live SLA state for a Campus post. Returns null for other categories, and
 * freezes once the post is resolved — a verified issue can't breach.
 */
export function computeSla(
  post: Pick<Post, "category" | "status" | "createdAt" | "metadata">,
  now: Date = new Date(),
  resolvedAt?: Date | null,
): SlaState | null {
  if (post.category !== "campus" || !post.createdAt) return null;

  const hours = slaHoursFor(post.metadata);
  const created = new Date(post.createdAt);
  const dueAt = new Date(created.getTime() + hours * 3_600_000);

  const settled = isSettled(post.status);
  const reference = settled ? (resolvedAt ?? now) : now;

  const msRemaining = dueAt.getTime() - reference.getTime();
  const totalMs = hours * 3_600_000;
  const elapsedFraction = Math.min(
    1,
    Math.max(0, (reference.getTime() - created.getTime()) / totalMs),
  );

  const breached = msRemaining < 0;
  const severity: SlaState["severity"] = breached
    ? "breached"
    : elapsedFraction > 0.75
      ? "warning"
      : "ok";

  return { hours, dueAt, msRemaining, breached, elapsedFraction, severity };
}

export function isSettled(status: PostStatus): boolean {
  return status === "verified" || status === "cancelled";
}

/** "4h 20m left" / "2h 05m over" — mono-font countdown copy. */
export function formatSlaRemaining(ms: number): string {
  const over = ms < 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);

  const body =
    days > 0
      ? `${days}d ${String(hours).padStart(2, "0")}h`
      : hours > 0
        ? `${hours}h ${String(minutes).padStart(2, "0")}m`
        : `${minutes}m`;

  return over ? `${body} over` : `${body} left`;
}
