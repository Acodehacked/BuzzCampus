// packages/core/lifecycle.ts
//
// CLAUDE.md Rule 4: every status change on the platform goes through
// transitionPost(). No route handler, tRPC procedure or server action
// writes posts.status directly.
//
// One function, three categories. A broken AC, an hour of tutoring and a
// vacant backend-developer seat on a Build all walk the same graph and
// leave the same audit trail — this is the concrete, code-level answer to
// "why is this one platform and not three" (docs/PRD.md §9.1).

import { and, desc, eq } from "drizzle-orm";
import {
  contributionEvents,
  db as defaultDb,
  postEvents,
  posts,
  responses,
  type Category,
  type Executor,
  type Post,
  type PostEvent,
  type PostStatus,
  type Role,
} from "@buzz/db";
import {
  ALLOWED_TRANSITIONS,
  CONTRIBUTION_POINTS,
} from "./constants";
import {
  badRequest,
  forbidden,
  invalidTransition,
  notFound,
} from "./errors";
import { getEscrowHeld, lockEscrow, refundEscrow, releaseEscrow } from "./ledger";
import { isPositive } from "./money";

export type Actor = {
  id: string;
  role: Role;
  department?: string | null;
};

export type TransitionInput = {
  postId: string;
  actor: Actor;
  toStatus: PostStatus;
  note?: string;
  attachmentUrl?: string;
  /**
   * The other party in the exchange. Only needed on `accepted` when no
   * response row has been accepted yet (e.g. staff self-assigning a Campus
   * issue straight out of their queue).
   */
  counterpartyId?: string;
};

export type TransitionResult = {
  post: Post;
  event: PostEvent;
  /** set when this transition moved credits */
  credits?: { movement: "locked" | "released" | "refunded"; amount: string };
};

/**
 * Move a post to a new status.
 *
 * In one transaction:
 *   1. lock and read the current post
 *   2. check the transition is legal, and that this actor may make it
 *   3. append an immutable postEvents row
 *   4. update posts.status
 *   5. run the status's side effects — escrow, contribution points —
 *      inside the same transaction, so credits can never move without the
 *      audit row that explains them, or vice versa
 */
export async function transitionPost(
  input: TransitionInput,
  executor?: Executor,
): Promise<TransitionResult> {
  const run = async (tx: Executor): Promise<TransitionResult> => {
    // 1 — lock the row so two people can't accept the same Ask at once
    const [current] = await tx
      .select()
      .from(posts)
      .where(eq(posts.id, input.postId))
      .for("update");

    if (!current) throw notFound("Post");

    const from = current.status;
    const to = input.toStatus;

    // 2 — is this move legal at all?
    if (from === to) {
      throw invalidTransition(from, to);
    }
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw invalidTransition(from, to);
    }
    assertActorMayTransition(current, input.actor, to, input.attachmentUrl);

    // 3 — append to the audit trail. Append-only: postEvents rows are
    //     never updated or deleted anywhere in this codebase.
    const [event] = await tx
      .insert(postEvents)
      .values({
        postId: current.id,
        actorId: input.actor.id,
        fromStatus: from,
        toStatus: to,
        note: input.note ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
      })
      .returning();

    if (!event) throw badRequest("Failed to write the audit event");

    // 4 — the status change itself
    const patch: Partial<typeof posts.$inferInsert> = { status: to };
    if (to === "verified" && input.attachmentUrl) {
      patch.metadata = {
        ...(current.metadata ?? {}),
        afterPhotoUrl: input.attachmentUrl,
      };
    }

    const [updated] = await tx
      .update(posts)
      .set(patch)
      .where(eq(posts.id, current.id))
      .returning();

    if (!updated) throw notFound("Post");

    // 5 — side effects, same transaction
    const credits = await applySideEffects(tx, {
      post: updated,
      from,
      to,
      actor: input.actor,
      counterpartyId: input.counterpartyId,
    });

    return { post: updated, event, credits };
  };

  if (executor) return run(executor);
  return defaultDb.transaction((tx) => run(tx as unknown as Executor));
}

/**
 * RBAC at the query layer, not just the UI (docs/PRD.md §11).
 *
 * Exported and pure so the test suite can exercise every role × status
 * combination without standing up a database.
 */
export function assertActorMayTransition(
  post: Pick<Post, "authorId" | "isAnonymous" | "category" | "type">,
  actor: Actor,
  to: PostStatus,
  attachmentUrl?: string,
) {
  const isAuthor = post.authorId === actor.id;
  const isAdmin = actor.role === "admin";
  const isStaff = actor.role === "staff";
  const isSafety = actor.role === "safety";

  // A sensitive Campus report is only ever actionable by a Safety Officer —
  // not by staff, and not by platform admins.
  if (post.isAnonymous && !(isSafety || isAuthor)) {
    throw forbidden("This report is restricted to the Safety Officer");
  }

  switch (to) {
    case "accepted":
    case "in_progress":
      // anyone can offer to help; the author can't accept their own post
      if (isAuthor && post.type === "ask") {
        throw forbidden("You can't accept your own Ask");
      }
      break;

    case "fulfilled":
      // whoever is doing the work marks it done
      break;

    case "verified":
      // only the person who asked (or an admin/staff for Campus) signs off
      if (!isAuthor && !isAdmin && !(post.category === "campus" && isStaff)) {
        throw forbidden("Only the person who posted this can verify it");
      }
      // Campus close-out needs the after-photo — docs/BUILD_PLAN.md Phase 3
      if (post.category === "campus" && !attachmentUrl) {
        throw badRequest(
          "Closing a Campus report needs an after-photo as proof",
        );
      }
      break;

    case "reopened":
      if (!isAuthor && !isAdmin) {
        throw forbidden("Only the person who posted this can reopen it");
      }
      break;

    case "cancelled":
      if (!isAuthor && !isAdmin) {
        throw forbidden("Only the person who posted this can cancel it");
      }
      break;

    case "open":
      // a helper stepping back out
      break;
  }
}

/**
 * The credit and reputation consequences of a status change. Kept inside
 * transitionPost rather than in the caller so they cannot be forgotten:
 * if the status moved, these ran.
 */
async function applySideEffects(
  tx: Executor,
  args: {
    post: Post;
    from: PostStatus;
    to: PostStatus;
    actor: Actor;
    counterpartyId?: string;
  },
): Promise<TransitionResult["credits"]> {
  const { post, from, to, actor } = args;
  const amount = post.creditAmount;
  const hasCredits = isPositive(amount);

  const counterparty =
    args.counterpartyId ?? (await findCounterparty(tx, post.id, actor.id));

  const { payerId, payeeId } = resolveParties(post, counterparty);

  if (to === "accepted" && hasCredits && amount && payerId) {
    const alreadyHeld = await getEscrowHeld(post.id, tx);
    if (!isPositive(alreadyHeld)) {
      await lockEscrow({ payerId, amount, postId: post.id }, tx);
      return { movement: "locked", amount };
    }
  }

  if (to === "verified") {
    let credits: TransitionResult["credits"];
    const held = hasCredits ? await getEscrowHeld(post.id, tx) : "0";

    if (isPositive(held) && payeeId) {
      await releaseEscrow({ payeeId, amount: held, postId: post.id }, tx);
      credits = { movement: "released", amount: held };
    }

    // One Buzz Score, all three categories (docs/PRD.md §6.4 #4)
    const helperId = payeeId ?? counterparty;
    if (helperId) {
      await tx.insert(contributionEvents).values({
        userId: helperId,
        category: post.category as Category,
        points: CONTRIBUTION_POINTS.helper[post.category as Category],
        postId: post.id,
      });
    }
    if (post.authorId && post.authorId !== helperId) {
      await tx.insert(contributionEvents).values({
        userId: post.authorId,
        category: post.category as Category,
        points: CONTRIBUTION_POINTS.requester,
        postId: post.id,
      });
    }

    // close out any outstanding responses
    await tx
      .update(responses)
      .set({ status: "completed" })
      .where(
        and(eq(responses.postId, post.id), eq(responses.status, "accepted")),
      );

    return credits;
  }

  // Work fell through — give the money back rather than stranding it.
  if (escrowPlanFor(from, to) === "refund" && payerId) {
    const held = await getEscrowHeld(post.id, tx);
    if (isPositive(held)) {
      await refundEscrow({ payerId, amount: held, postId: post.id }, tx);
      return { movement: "refunded", amount: held };
    }
  }

  return undefined;
}

/**
 * Who pays and who gets paid. On an Ask the author is buying help; on a
 * Give the author is selling it. Everything downstream of this is identical
 * for both — which is why one lifecycle covers both directions.
 */
export function resolveParties(
  post: Pick<Post, "type" | "authorId">,
  counterpartyId: string | null,
): { payerId: string | null; payeeId: string | null } {
  return post.type === "ask"
    ? { payerId: post.authorId, payeeId: counterpartyId }
    : { payerId: counterpartyId, payeeId: post.authorId };
}

/**
 * What should happen to escrowed credits on a given transition. Pure, so
 * the money rules can be asserted directly in tests.
 */
export function escrowPlanFor(
  from: PostStatus,
  to: PostStatus,
): "lock" | "release" | "refund" | null {
  if (to === "accepted") return "lock";
  if (to === "verified") return "release";
  if ((to === "cancelled" || to === "reopened" || to === "open") && from !== "open") {
    return "refund";
  }
  return null;
}

/** The accepted responder on this post, if there is one. */
async function findCounterparty(
  tx: Executor,
  postId: string,
  fallbackActorId: string,
): Promise<string | null> {
  const [accepted] = await tx
    .select({ responderId: responses.responderId })
    .from(responses)
    .where(
      and(
        eq(responses.postId, postId),
        eq(responses.status, "accepted"),
      ),
    )
    .orderBy(desc(responses.createdAt))
    .limit(1);

  return accepted?.responderId ?? fallbackActorId ?? null;
}

/** Whether `to` is reachable from `from` — used to render action buttons. */
export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** The moves available from a status, for the detail page's action bar. */
export function nextStatuses(from: PostStatus): PostStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/** The full audit trail for a post, oldest first. */
export async function getPostHistory(postId: string, executor?: Executor) {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  return tx
    .select()
    .from(postEvents)
    .where(eq(postEvents.postId, postId))
    .orderBy(postEvents.createdAt);
}
