// packages/core/ledger.ts
//
// CLAUDE.md Rule 4: every credit balance change on the platform goes
// through transferCredits(). There is no `UPDATE wallets SET balance = ...`
// anywhere else in this codebase — grep for it.
//
// Escrow is modelled as a transfer to/from `null`, which means "held by the
// platform". That keeps a single primitive instead of a lock/release/refund
// trio each poking at balances, and every movement leaves a ledger row, so
// the wallet balance is always reconstructible by replaying the ledger.

import { and, eq, sql as raw } from "drizzle-orm";
import { db as defaultDb, ledgerEntries, wallets, type Executor } from "@buzz/db";
import { LEDGER_REASONS, STARTER_CREDITS, type LedgerReason } from "./constants";
import { addCredits, compareCredits, normalizeCredits, subtractCredits, toMinor } from "./money";
import { insufficientCredits, badRequest, notFound } from "./errors";

export type TransferInput = {
  /** payer — `null` means the platform escrow pool is the source */
  fromUserId: string | null;
  /** payee — `null` means the credits are being held in escrow */
  toUserId: string | null;
  amount: string;
  reason: LedgerReason | string;
  postId?: string | null;
  /** skip the balance check — only for the signup grant, which mints credits */
  allowMint?: boolean;
};

export type TransferResult = {
  amount: string;
  fromBalance: string | null;
  toBalance: string | null;
  entryIds: string[];
};

/**
 * Move credits between two wallets in one transaction.
 *
 * - Debits the payer, credits the payee, writes one ledger row per side.
 * - Rows are written even when one side is the escrow pool, so the ledger
 *   always shows where credits went.
 * - Takes an `Executor` so callers already inside a transaction (notably
 *   transitionPost) compose into it rather than opening a nested one.
 */
export async function transferCredits(
  input: TransferInput,
  executor?: Executor,
): Promise<TransferResult> {
  const { fromUserId, toUserId, reason, postId = null } = input;
  const amount = normalizeCredits(input.amount);

  if (toMinor(amount) <= 0) {
    throw badRequest("Transfer amount must be greater than zero");
  }
  if (!fromUserId && !toUserId) {
    throw badRequest("A transfer needs at least one real wallet");
  }
  if (fromUserId && fromUserId === toUserId) {
    throw badRequest("Cannot transfer credits to the same wallet");
  }

  const run = async (tx: Executor): Promise<TransferResult> => {
    const entryIds: string[] = [];
    let fromBalance: string | null = null;
    let toBalance: string | null = null;

    if (fromUserId) {
      // SELECT ... FOR UPDATE: two concurrent spends on the same wallet
      // serialise here instead of both reading the same stale balance.
      const [payer] = await tx
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.userId, fromUserId))
        .for("update");

      if (!payer) throw notFound("Wallet");

      if (!input.allowMint && compareCredits(payer.balance, amount) < 0) {
        throw insufficientCredits(payer.balance, amount);
      }

      fromBalance = subtractCredits(payer.balance, amount);
      await tx
        .update(wallets)
        .set({ balance: fromBalance })
        .where(eq(wallets.userId, fromUserId));

      const [entry] = await tx
        .insert(ledgerEntries)
        .values({
          postId,
          userId: fromUserId,
          direction: "debit",
          amount,
          reason,
        })
        .returning({ id: ledgerEntries.id });
      if (entry) entryIds.push(entry.id);
    }

    if (toUserId) {
      const [payee] = await tx
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.userId, toUserId))
        .for("update");

      if (!payee) throw notFound("Wallet");

      toBalance = addCredits(payee.balance, amount);
      await tx
        .update(wallets)
        .set({ balance: toBalance })
        .where(eq(wallets.userId, toUserId));

      const [entry] = await tx
        .insert(ledgerEntries)
        .values({
          postId,
          userId: toUserId,
          direction: "credit",
          amount,
          reason,
        })
        .returning({ id: ledgerEntries.id });
      if (entry) entryIds.push(entry.id);
    }

    return { amount, fromBalance, toBalance, entryIds };
  };

  // An executor passed in is always an open transaction (transitionPost
  // composes into it). With nothing passed we own the transaction.
  if (executor) return run(executor);
  return defaultDb.transaction((tx) => run(tx as unknown as Executor));
}

/** Lock a post's credits away from the payer until the work is verified. */
export function lockEscrow(
  args: { payerId: string; amount: string; postId: string },
  executor?: Executor,
) {
  return transferCredits(
    {
      fromUserId: args.payerId,
      toUserId: null,
      amount: args.amount,
      reason: LEDGER_REASONS.escrowLock,
      postId: args.postId,
    },
    executor,
  );
}

/** Release held credits to whoever did the work. */
export function releaseEscrow(
  args: { payeeId: string; amount: string; postId: string },
  executor?: Executor,
) {
  return transferCredits(
    {
      fromUserId: null,
      toUserId: args.payeeId,
      amount: args.amount,
      reason: LEDGER_REASONS.escrowRelease,
      postId: args.postId,
    },
    executor,
  );
}

/** Give held credits back — the post was cancelled or reopened. */
export function refundEscrow(
  args: { payerId: string; amount: string; postId: string },
  executor?: Executor,
) {
  return transferCredits(
    {
      fromUserId: null,
      toUserId: args.payerId,
      amount: args.amount,
      reason: LEDGER_REASONS.escrowRefund,
      postId: args.postId,
    },
    executor,
  );
}

/** The starter grant. The one place credits are minted rather than moved. */
export function grantStarterCredits(
  userId: string,
  executor?: Executor,
  amount: string = STARTER_CREDITS,
) {
  return transferCredits(
    {
      fromUserId: null,
      toUserId: userId,
      amount,
      reason: LEDGER_REASONS.starterGrant,
      allowMint: true,
    },
    executor,
  );
}

/**
 * How much of this post's credit is currently sitting in escrow —
 * derived from the ledger rather than stored, so it can't drift out of
 * sync with the entries that produced it.
 */
export async function getEscrowHeld(
  postId: string,
  executor?: Executor,
): Promise<string> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  const [row] = await tx
    .select({
      held: raw<string>`
        COALESCE(SUM(
          CASE
            WHEN ${ledgerEntries.reason} = ${LEDGER_REASONS.escrowLock} THEN ${ledgerEntries.amount}
            WHEN ${ledgerEntries.reason} IN (${LEDGER_REASONS.escrowRelease}, ${LEDGER_REASONS.escrowRefund}) THEN -${ledgerEntries.amount}
            ELSE 0
          END
        ), 0)::text
      `,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.postId, postId));

  return normalizeCredits(row?.held ?? "0");
}

/** Full ledger history for one wallet, newest first. */
export async function getLedgerHistory(
  userId: string,
  limit = 50,
  executor?: Executor,
) {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  return tx
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(raw`${ledgerEntries.createdAt} DESC`)
    .limit(limit);
}

export async function getBalance(
  userId: string,
  executor?: Executor,
): Promise<string> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  const [wallet] = await tx
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId));
  return wallet?.balance ?? "0.00";
}

/**
 * Reconciliation check: replaying every ledger row for a user must produce
 * exactly their stored balance. Used by the admin economy dashboard.
 */
export async function reconcileWallet(
  userId: string,
  executor?: Executor,
): Promise<{ stored: string; replayed: string; ok: boolean }> {
  const tx = (executor ?? defaultDb) as typeof defaultDb;
  const [row] = await tx
    .select({
      replayed: raw<string>`
        COALESCE(SUM(
          CASE WHEN ${ledgerEntries.direction} = 'credit'
               THEN ${ledgerEntries.amount}
               ELSE -${ledgerEntries.amount} END
        ), 0)::text
      `,
    })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.userId, userId)));

  const stored = await getBalance(userId, executor);
  const replayed = normalizeCredits(row?.replayed ?? "0");
  return { stored, replayed, ok: compareCredits(stored, replayed) === 0 };
}
