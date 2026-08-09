"use client";

import { cn } from "../utils/cn";
import { CreditAmount } from "../primitives/Badge";
import { relativeTime } from "./PostCard";

/**
 * One ledger line. Every credit movement on the platform produced one of
 * these — including the escrow legs — so the wallet reads as a real
 * account statement rather than a balance with some history attached.
 */

const REASON_LABEL: Record<string, string> = {
  starter_grant: "Starter grant",
  escrow_lock: "Held in escrow",
  escrow_release: "Escrow released",
  escrow_refund: "Escrow refunded",
  admin_adjustment: "Adjustment",
};

export type LedgerRowData = {
  id: string;
  direction: "debit" | "credit";
  amount: string;
  reason?: string | null;
  createdAt?: Date | string | null;
  postTitle?: string | null;
  postId?: string | null;
  category?: string | null;
};

export function LedgerRow({
  entry,
  href,
  runningBalance,
  className,
}: {
  entry: LedgerRowData;
  href?: string;
  runningBalance?: string;
  className?: string;
}) {
  const isCredit = entry.direction === "credit";
  const label =
    REASON_LABEL[entry.reason ?? ""] ??
    (entry.reason ?? "Transfer").replace(/_/g, " ");

  const Wrapper = href ? "a" : "div";

  return (
    <Wrapper
      href={href}
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-graphite-700/70",
        "px-1 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto]",
        href && "transition-colors hover:bg-graphite-800/40",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-text-primary-dark">
          {entry.postTitle ?? label}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
          <span>{label}</span>
          {entry.createdAt ? (
            <time className="font-mono tabular-nums opacity-70">
              {relativeTime(entry.createdAt)}
            </time>
          ) : null}
        </p>
      </div>

      <CreditAmount
        value={entry.amount.replace(/\.00$/, "")}
        sign={isCredit ? "+" : "−"}
        className="text-sm"
      />

      {runningBalance ? (
        <span className="hidden w-20 text-right font-mono text-xs tabular-nums text-text-muted sm:inline">
          {runningBalance}
        </span>
      ) : null}
    </Wrapper>
  );
}
