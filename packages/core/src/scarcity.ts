// packages/core/scarcity.ts
//
// The Scarcity Index — a live per-skill credit multiplier driven by the
// ratio of people asking for a skill to people currently offering it
// (docs/PRD.md §6.2 #5). Teaching something nobody else can teach is worth
// more than teaching something ten people are already offering.

import { and, eq, inArray, sql as raw } from "drizzle-orm";
import {
  db as defaultDb,
  posts,
  scarcitySnapshots,
  type Executor,
} from "@buzz/db";

export const SCARCITY_FLOOR = 0.75;
export const SCARCITY_CEILING = 2.5;

/**
 * multiplier = clamp(0.75 … 2.5) of sqrt((openAsks + 1) / (activeGives + 1))
 *
 * The +1 on each side is deliberate: it avoids dividing by zero, and leaves
 * a brand-new tag with no activity at a neutral 1.0.
 *
 * The square root matters. On the raw ratio, five unanswered asks and no
 * givers already pins the multiplier to the ceiling, so every scarce skill
 * looks equally scarce and the index stops saying anything. Damping it
 * means the curve keeps discriminating right up to the ceiling.
 */
export function computeMultiplier(openAsks: number, activeGives: number): number {
  const ratio = (openAsks + 1) / (activeGives + 1);
  const damped = Math.sqrt(ratio);
  const clamped = Math.min(SCARCITY_CEILING, Math.max(SCARCITY_FLOOR, damped));
  return Math.round(clamped * 100) / 100;
}

export type ScarcityRow = {
  skillTag: string;
  openRequests: number;
  activeGivers: number;
  multiplier: number;
};

/**
 * Recompute every skill tag currently visible in the Skills category and
 * write one snapshot row per tag. Called after Skills posts are created and
 * from the admin console; cheap enough to run inline.
 */
export async function recomputeScarcityIndex(
  executor?: Executor,
): Promise<ScarcityRow[]> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;

  const rows = await tx
    .select({
      skillTag: raw<string>`${posts.metadata}->>'skillTag'`,
      openAsks: raw<number>`
        COUNT(*) FILTER (WHERE ${posts.type} = 'ask' AND ${posts.status} IN ('open','reopened'))::int
      `,
      activeGives: raw<number>`
        COUNT(*) FILTER (WHERE ${posts.type} = 'give' AND ${posts.status} IN ('open','reopened','accepted'))::int
      `,
    })
    .from(posts)
    .where(
      and(
        eq(posts.category, "skills"),
        raw`${posts.metadata}->>'skillTag' IS NOT NULL`,
      ),
    )
    .groupBy(raw`${posts.metadata}->>'skillTag'`);

  const computed: ScarcityRow[] = rows
    .filter((r) => Boolean(r.skillTag))
    .map((r) => ({
      skillTag: r.skillTag,
      openRequests: Number(r.openAsks ?? 0),
      activeGivers: Number(r.activeGives ?? 0),
      multiplier: computeMultiplier(
        Number(r.openAsks ?? 0),
        Number(r.activeGives ?? 0),
      ),
    }));

  if (computed.length > 0) {
    await tx.insert(scarcitySnapshots).values(
      computed.map((c) => ({
        skillTag: c.skillTag,
        multiplier: c.multiplier.toFixed(2),
        openRequests: c.openRequests,
        activeGivers: c.activeGivers,
      })),
    );
  }

  return computed.sort((a, b) => b.multiplier - a.multiplier);
}

/** The newest snapshot per skill tag — what the chart and compose flow read. */
export async function getCurrentScarcity(
  executor?: Executor,
  limit = 12,
): Promise<ScarcityRow[]> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;

  // One grouped read picking the newest row per tag — no window-function
  // subquery needed at this table size.
  const latest = await tx
    .select({
      skillTag: scarcitySnapshots.skillTag,
      multiplier: raw<string>`
        (ARRAY_AGG(${scarcitySnapshots.multiplier} ORDER BY ${scarcitySnapshots.computedAt} DESC))[1]
      `,
      openRequests: raw<number>`
        (ARRAY_AGG(${scarcitySnapshots.openRequests} ORDER BY ${scarcitySnapshots.computedAt} DESC))[1]::int
      `,
      activeGivers: raw<number>`
        (ARRAY_AGG(${scarcitySnapshots.activeGivers} ORDER BY ${scarcitySnapshots.computedAt} DESC))[1]::int
      `,
    })
    .from(scarcitySnapshots)
    .groupBy(scarcitySnapshots.skillTag)
    .limit(limit);

  return latest
    .map((r) => ({
      skillTag: r.skillTag,
      multiplier: Number(r.multiplier ?? 1),
      openRequests: Number(r.openRequests ?? 0),
      activeGivers: Number(r.activeGivers ?? 0),
    }))
    .sort((a, b) => b.multiplier - a.multiplier);
}

/** The multiplier for one tag right now — used when composing a Skills post. */
export async function getMultiplierForTag(
  skillTag: string,
  executor?: Executor,
): Promise<number> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  const [row] = await tx
    .select({ multiplier: scarcitySnapshots.multiplier })
    .from(scarcitySnapshots)
    .where(inArray(scarcitySnapshots.skillTag, [skillTag.toLowerCase()]))
    .orderBy(raw`${scarcitySnapshots.computedAt} DESC`)
    .limit(1);

  return row ? Number(row.multiplier) : 1;
}

/** How far the index is spread — a health metric for the credit economy. */
export function scarcitySpread(rows: ScarcityRow[]): number {
  if (rows.length < 2) return 0;
  const values = rows.map((r) => r.multiplier);
  return Math.round((Math.max(...values) - Math.min(...values)) * 100) / 100;
}
