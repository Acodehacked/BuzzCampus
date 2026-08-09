"use client";

import Link from "next/link";
import { CheckCircle2, Lock, TriangleAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Button,
  CATEGORY,
  CreditAmount,
  EmptyState,
  LedgerRow,
  SectionHeading,
  Skeleton,
  Surface,
  cn,
  type CategoryKey,
} from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

/**
 * One wallet, one ledger, all three categories (docs/PRD.md §6.4 #3).
 *
 * The balance is the point here, so the number gets real size — but note
 * there is no 4-column stat-card grid: the breakdown below it is a table
 * because it's tabular, and the index is a chart because it's a
 * distribution (docs/DESIGN_SYSTEM.md §3, stat-card row).
 */
export function WalletView() {
  const { data: summary, isLoading } = trpc.wallet.summary.useQuery();
  const { data: ledger } = trpc.wallet.ledger.useQuery({ limit: 40 });
  const { data: scarcity } = trpc.wallet.scarcity.useQuery({ limit: 10 });
  const { data: reconcile } = trpc.wallet.reconcile.useQuery();

  if (isLoading || !summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const chartData =
    scarcity?.rows.map((row) => ({
      tag: row.skillTag,
      multiplier: row.multiplier,
      asking: row.openRequests,
      offering: row.activeGivers,
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* balance — the one place a big number is genuinely the point */}
        <Surface className="p-5">
          <p className="text-xs uppercase tracking-[0.1em] text-text-muted">
            Balance
          </p>
          <p className="mt-2 font-mono text-5xl tabular-nums leading-none text-text-primary-dark">
            {summary.balance.replace(/\.00$/, "")}
            <span className="ml-2 text-base text-text-muted">credits</span>
          </p>

          {Number(summary.inEscrow) > 0 ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-warning-500">
              <Lock className="h-3 w-3" />
              <span className="font-mono tabular-nums">
                {summary.inEscrow.replace(/\.00$/, "")}
              </span>
              held against work in progress
            </p>
          ) : null}

          {reconcile ? (
            <p
              className={cn(
                "mt-4 flex items-start gap-1.5 border-t border-graphite-700 pt-3 text-xs leading-relaxed",
                reconcile.ok ? "text-text-muted" : "text-danger-500",
              )}
            >
              {reconcile.ok ? (
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success-500" />
              ) : (
                <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
              )}
              {reconcile.ok
                ? "Balance reconciles exactly against every ledger entry below."
                : `Balance says ${reconcile.stored} but the ledger replays to ${reconcile.replayed}.`}
            </p>
          ) : null}
        </Surface>

        {/* where it came from, across categories */}
        <Surface className="p-5">
          <h2 className="mb-4 text-xs uppercase tracking-[0.1em] text-text-muted">
            Across categories
          </h2>
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing has moved yet. Offer to help with something in the feed.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="pb-2 font-normal">Category</th>
                  <th className="pb-2 text-right font-normal">Earned</th>
                  <th className="pb-2 text-right font-normal">Spent</th>
                  <th className="pb-2 text-right font-normal">Net</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCategory.map((row) => {
                  const tokens =
                    CATEGORY[row.category as CategoryKey] ?? null;
                  return (
                    <tr
                      key={row.category}
                      className="border-t border-graphite-700/70"
                    >
                      <td className="py-2.5">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "h-1.5 w-1.5 rounded-sm",
                              tokens?.dot ?? "bg-text-muted",
                            )}
                          />
                          <span className="capitalize text-text-primary-dark">
                            {row.category}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-success-500">
                        {row.earned.replace(/\.00$/, "")}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-text-muted">
                        {row.spent.replace(/\.00$/, "")}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-text-primary-dark">
                        {row.net.replace(/\.00$/, "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Surface>
      </div>

      {/* The Scarcity Index as a real chart (DESIGN_SYSTEM.md §5.4) */}
      {chartData.length > 0 ? (
        <section>
          <SectionHeading
            title="Scarcity Index"
            description={`What each skill is worth right now. Spread across the index: ${scarcity?.spread.toFixed(2)}×`}
          />
          <Surface className="p-5">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, bottom: 4, left: -20 }}
                >
                  <CartesianGrid
                    stroke="#232A34"
                    strokeDasharray="2 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="tag"
                    tick={{ fill: "#8A93A6", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#232A34" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fill: "#8A93A6", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, "dataMax + 0.4"]}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "#181D24" }}
                    contentStyle={{
                      background: "#181D24",
                      border: "1px solid #232A34",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#F5F6F7" }}
                    formatter={(value: number, name: string) => [
                      name === "multiplier" ? `${value.toFixed(2)}×` : value,
                      name === "multiplier"
                        ? "Multiplier"
                        : name === "asking"
                          ? "Asking"
                          : "Offering",
                    ]}
                  />
                  <Bar
                    dataKey="multiplier"
                    fill={CATEGORY.skills.hex}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              Above 1.00× means more people are asking for that skill than
              offering it — teaching it right now earns more.
            </p>
          </Surface>
        </section>
      ) : null}

      {/* the ledger */}
      <section>
        <SectionHeading
          title="Ledger"
          description="Every credit movement, including the escrow legs. Append-only."
        />
        <Surface className="px-4">
          {!ledger || ledger.items.length === 0 ? (
            <EmptyState
              className="my-4 border-0"
              title="No entries yet"
              description="Your starter grant shows up here, and so does everything after it."
              action={
                <Button asChild variant="quiet" size="sm">
                  <Link href="/feed?category=skills">Find something to help with</Link>
                </Button>
              }
            />
          ) : (
            ledger.items.map((entry) => (
              <LedgerRow
                key={entry.id}
                entry={entry}
                href={entry.postId ? `/posts/${entry.postId}` : undefined}
              />
            ))
          )}
        </Surface>
      </section>
    </div>
  );
}
