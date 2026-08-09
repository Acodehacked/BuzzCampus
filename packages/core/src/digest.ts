// packages/core/digest.ts
//
// The unified notification centre and the mixed daily digest
// (docs/PRD.md §6.4 #5). Both are DERIVED from the shared audit trail —
// postEvents, responses and ledgerEntries — rather than stored in a
// notifications table. Same reasoning as the rest of the platform: there is
// one record of what happened, and everything else is a view over it.

import { and, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import {
  db as defaultDb,
  ledgerEntries,
  postEvents,
  posts,
  responses,
  users,
  type Category,
  type Executor,
} from "@buzz/db";
import { STATUS_LABEL } from "./constants";
import { formatCredits } from "./money";

export type NotificationItem = {
  id: string;
  kind: "event" | "response" | "credit";
  postId: string | null;
  category: Category | null;
  title: string;
  body: string;
  actorName: string | null;
  createdAt: Date;
};

/**
 * Everything that happened to things this user is involved in — posts they
 * wrote and posts they responded to — newest first.
 */
export async function getNotifications(
  userId: string,
  limit = 20,
  executor?: Executor,
): Promise<NotificationItem[]> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;

  const involved = tx
    .select({ id: posts.id })
    .from(posts)
    .leftJoin(responses, eq(responses.postId, posts.id))
    .where(or(eq(posts.authorId, userId), eq(responses.responderId, userId)));

  const events = await tx
    .select({
      id: postEvents.id,
      postId: postEvents.postId,
      title: posts.title,
      category: posts.category,
      fromStatus: postEvents.fromStatus,
      toStatus: postEvents.toStatus,
      note: postEvents.note,
      actorName: users.name,
      createdAt: postEvents.createdAt,
    })
    .from(postEvents)
    .innerJoin(posts, eq(posts.id, postEvents.postId))
    .leftJoin(users, eq(users.id, postEvents.actorId))
    .where(
      and(
        inArray(postEvents.postId, involved),
        ne(postEvents.actorId, userId),
      ),
    )
    .orderBy(desc(postEvents.createdAt))
    .limit(limit);

  const offers = await tx
    .select({
      id: responses.id,
      postId: responses.postId,
      title: posts.title,
      category: posts.category,
      message: responses.message,
      actorName: users.name,
      createdAt: responses.createdAt,
    })
    .from(responses)
    .innerJoin(posts, eq(posts.id, responses.postId))
    .leftJoin(users, eq(users.id, responses.responderId))
    .where(
      and(eq(posts.authorId, userId), eq(responses.status, "proposed")),
    )
    .orderBy(desc(responses.createdAt))
    .limit(limit);

  const credits = await tx
    .select({
      id: ledgerEntries.id,
      postId: ledgerEntries.postId,
      amount: ledgerEntries.amount,
      direction: ledgerEntries.direction,
      reason: ledgerEntries.reason,
      category: posts.category,
      title: posts.title,
      createdAt: ledgerEntries.createdAt,
    })
    .from(ledgerEntries)
    .leftJoin(posts, eq(posts.id, ledgerEntries.postId))
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);

  const merged: NotificationItem[] = [
    ...events.map((e) => ({
      id: e.id,
      kind: "event" as const,
      postId: e.postId,
      category: e.category as Category,
      title: e.title,
      body: `${e.actorName ?? "Someone"} moved this to ${
        STATUS_LABEL[(e.toStatus ?? "open") as keyof typeof STATUS_LABEL] ??
        e.toStatus
      }${e.note ? ` — ${e.note}` : ""}`,
      actorName: e.actorName,
      createdAt: e.createdAt ?? new Date(),
    })),
    ...offers.map((o) => ({
      id: o.id,
      kind: "response" as const,
      postId: o.postId,
      category: o.category as Category,
      title: o.title,
      body: `${o.actorName ?? "Someone"} offered to help${
        o.message ? ` — ${o.message}` : ""
      }`,
      actorName: o.actorName,
      createdAt: o.createdAt ?? new Date(),
    })),
    ...credits.map((c) => ({
      id: c.id,
      kind: "credit" as const,
      postId: c.postId,
      category: (c.category as Category) ?? null,
      title: c.title ?? "Wallet",
      body: `${c.direction === "credit" ? "+" : "−"}${formatCredits(
        c.amount,
      )} credits · ${(c.reason ?? "").replace(/_/g, " ")}`,
      actorName: null,
      createdAt: c.createdAt ?? new Date(),
    })),
  ];

  return merged
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export type DigestItem = {
  category: Category;
  postId: string;
  title: string;
  reason: string;
};

/**
 * The mixed daily digest — at most one item per category, chosen so that a
 * student who only ever opens Buzz for Campus still gets a Skills and a
 * Builds item in front of them. This is the same cross-category exposure
 * the feed produces, delivered to people who haven't opened it today.
 */
export async function getDailyDigest(
  viewer: { id: string; department?: string | null },
  executor?: Executor,
): Promise<DigestItem[]> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  const since = new Date(Date.now() - 24 * 3_600_000);

  const rows = await tx
    .select({
      id: posts.id,
      title: posts.title,
      category: posts.category,
      urgency: sql<string>`${posts.metadata}->>'urgency'`,
      rank: sql<number>`
        ROW_NUMBER() OVER (
          PARTITION BY ${posts.category}
          ORDER BY
            (${posts.metadata}->>'urgency' = 'high') DESC NULLS LAST,
            ${posts.upvoteCount} DESC,
            ${posts.createdAt} DESC
        )::int
      `,
    })
    .from(posts)
    .where(
      and(
        inArray(posts.status, ["open", "reopened"]),
        eq(posts.isAnonymous, false),
        gte(posts.createdAt, since),
        ne(posts.authorId, viewer.id),
      ),
    );

  return rows
    .filter((r) => Number(r.rank) === 1)
    .map((r) => ({
      category: r.category as Category,
      postId: r.id,
      title: r.title,
      reason:
        r.category === "campus"
          ? r.urgency === "high"
            ? "Urgent on campus today"
            : "New on campus today"
          : r.category === "skills"
            ? "Someone needs a hand with this"
            : "A project is looking for people",
    }));
}

/** The live-activity pulse in the shell nav — the last few things that moved. */
export async function getRecentActivity(limit = 8, executor?: Executor) {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  return tx
    .select({
      id: postEvents.id,
      postId: postEvents.postId,
      title: posts.title,
      category: posts.category,
      toStatus: postEvents.toStatus,
      createdAt: postEvents.createdAt,
    })
    .from(postEvents)
    .innerJoin(posts, eq(posts.id, postEvents.postId))
    .where(eq(posts.isAnonymous, false))
    .orderBy(desc(postEvents.createdAt))
    .limit(limit);
}
