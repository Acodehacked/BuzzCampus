// packages/core/ranking.ts
//
// One ranking function for one mixed feed. Campus posts rank on proximity,
// Skills posts on matching skill tags, Builds posts on department and on
// required-role tags matching what the viewer has offered — but they all
// land in the SAME ordered list, which is the entire point of the product
// (docs/PRD.md §3).
//
// Non-negotiable per docs/PRD.md §11: this must degrade gracefully. A brand
// new user with no location, no skills and no department still gets a
// sensible, non-empty, recency-ranked mixed feed — every personalisation
// term below is additive on top of recency, never a filter.

import { sql, type SQL } from "drizzle-orm";
import { posts, builds, responses } from "@buzz/db";

export type ViewerContext = {
  userId?: string | null;
  department?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** skill tags the viewer has offered or asked about */
  skillTags?: string[];
};

/** Recency half-life, in seconds. ~2 days. */
const RECENCY_TAU = 172_800;

/** Campus proximity stops mattering past this distance, in metres. */
const PROXIMITY_RADIUS_M = 1_500;

/**
 * Builds a single numeric relevance score as a SQL expression, so ranking
 * happens in Postgres over an index rather than by pulling rows into Node
 * and sorting them there.
 */
export function feedRankExpression(viewer: ViewerContext): SQL<number> {
  const tags = (viewer.skillTags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const parts: SQL[] = [];

  // ── base: recency, always present, always the fallback ordering ──
  parts.push(sql`
    100 * EXP(
      -GREATEST(EXTRACT(EPOCH FROM (NOW() - COALESCE(${posts.createdAt}, NOW()))), 0)
      / ${RECENCY_TAU}
    )
  `);

  // Something still open is more useful to see than something settled.
  parts.push(sql`
    CASE WHEN ${posts.status} IN ('open', 'reopened') THEN 30
         WHEN ${posts.status} IN ('accepted', 'in_progress') THEN 8
         ELSE 0 END
  `);

  // Community signal, damped so a popular old post can't dominate.
  parts.push(sql`LEAST(15, LN(1 + ${posts.upvoteCount}) * 6)`);

  // ── Campus: proximity ──
  if (viewer.lat != null && viewer.lng != null) {
    // Haversine in plain SQL — no PostGIS needed for a campus-sized radius.
    parts.push(sql`
      CASE WHEN ${posts.category} = 'campus'
                AND ${posts.lat} IS NOT NULL AND ${posts.lng} IS NOT NULL
      THEN 35 * GREATEST(0, 1 - LEAST(1,
        (2 * 6371000 * ASIN(SQRT(
          POWER(SIN(RADIANS(${posts.lat} - ${viewer.lat}) / 2), 2)
          + COS(RADIANS(${viewer.lat})) * COS(RADIANS(${posts.lat}))
          * POWER(SIN(RADIANS(${posts.lng} - ${viewer.lng}) / 2), 2)
        ))) / ${PROXIMITY_RADIUS_M}
      ))
      ELSE 0 END
    `);
  }

  // Urgent Campus reports surface regardless of who is looking.
  parts.push(sql`
    CASE WHEN ${posts.category} = 'campus'
              AND ${posts.metadata}->>'urgency' = 'high' THEN 18 ELSE 0 END
  `);

  // ── Skills: tag match ──
  if (tags.length > 0) {
    parts.push(sql`
      CASE WHEN ${posts.category} = 'skills'
                AND LOWER(${posts.metadata}->>'skillTag') = ANY(${tags}::text[])
      THEN 40 ELSE 0 END
    `);

    // ── Builds: teammate discovery (docs/PRD.md Flow C) ──
    // An open role tagged `embedded-systems` surfaces to whoever has
    // offered `embedded-systems` in Skills. No separate cross-module
    // mechanism — the shared feed just does its job.
    parts.push(sql`
      CASE WHEN ${posts.category} = 'builds'
                AND ${posts.metadata} ? 'requiredTags'
                AND EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements_text(${posts.metadata}->'requiredTags') AS rt
                  WHERE LOWER(rt) = ANY(${tags}::text[])
                )
      THEN 45 ELSE 0 END
    `);
  }

  // ── Builds: same department ──
  if (viewer.department) {
    parts.push(sql`
      CASE WHEN ${posts.category} = 'builds' AND EXISTS (
        SELECT 1 FROM ${builds} b
        WHERE b.id = ${posts.buildId} AND b.department = ${viewer.department}
      ) THEN 22 ELSE 0 END
    `);
  }

  // ── your own thread moved ──
  // Flow D opens with "checks the feed for a reply to her Skills Ask" —
  // so an Ask of yours with someone waiting on you ranks up.
  if (viewer.userId) {
    parts.push(sql`
      CASE WHEN ${posts.authorId} = ${viewer.userId} AND EXISTS (
        SELECT 1 FROM ${responses} r
        WHERE r.post_id = ${posts.id} AND r.status = 'proposed'
      ) THEN 55 ELSE 0 END
    `);
  }

  return sql.join(parts, sql` + `) as SQL<number>;
}

/**
 * A plain-language explanation of why a post is where it is. Rendered on
 * the card as a quiet one-liner — ranking people can't see reads as magic,
 * and magic reads as noise.
 */
export function explainRank(
  post: {
    category: string;
    metadata?: Record<string, unknown> | null;
    authorId?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
  viewer: ViewerContext,
): string | null {
  const tags = (viewer.skillTags ?? []).map((t) => t.toLowerCase());

  if (viewer.userId && post.authorId === viewer.userId) return "Your post";

  if (post.category === "skills") {
    const tag = String(post.metadata?.skillTag ?? "").toLowerCase();
    if (tag && tags.includes(tag)) return `Matches your ${tag}`;
  }

  if (post.category === "builds") {
    const required = (post.metadata?.requiredTags as string[] | undefined) ?? [];
    const hit = required.find((t) => tags.includes(t.toLowerCase()));
    if (hit) return `Needs ${hit} — you offer that`;
  }

  if (
    post.category === "campus" &&
    viewer.lat != null &&
    viewer.lng != null &&
    post.lat != null &&
    post.lng != null
  ) {
    const metres = haversine(viewer.lat, viewer.lng, post.lat, post.lng);
    if (metres < PROXIMITY_RADIUS_M) return `${Math.round(metres)}m away`;
  }

  return null;
}

export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
