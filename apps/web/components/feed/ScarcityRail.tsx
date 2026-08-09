"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { CATEGORY, Surface, cn } from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

/**
 * The Scarcity Index, as a compact rail beside the feed.
 *
 * This is a real chart of real numbers, not decoration
 * (docs/DESIGN_SYSTEM.md §5.4) — a horizontal bar per skill tag showing
 * its live multiplier, with the supply/demand counts that produced it.
 * Teaching something nobody else offers pays more; that is the whole
 * mechanism, and it should be legible at a glance.
 */
export function ScarcityRail() {
  const { data } = trpc.wallet.scarcity.useQuery(
    { limit: 8 },
    { staleTime: 120_000 },
  );

  const rows = data?.rows ?? [];
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.multiplier), 1.5);

  return (
    <Surface data-tour="scarcity-rail" className="p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm tracking-tight text-text-primary-dark">
          Scarcity Index
        </h2>
        <span className="font-mono text-[0.625rem] tabular-nums text-text-muted">
          spread {data?.spread.toFixed(2)}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-text-muted">
        What an hour of each skill is worth right now, from how many people
        are asking versus offering.
      </p>

      <ul className="space-y-2">
        {rows.map((row) => {
          const scarce = row.multiplier > 1;
          const width = Math.max(6, (row.multiplier / max) * 100);
          return (
            <li key={row.skillTag}>
              <Link
                href={`/feed?category=skills&tag=${encodeURIComponent(row.skillTag)}`}
                className="group block"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-xs lowercase text-text-primary-dark group-hover:text-white">
                    {row.skillTag}
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums",
                      scarce ? "text-skills-teal-400" : "text-text-muted",
                    )}
                  >
                    {scarce ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {row.multiplier.toFixed(2)}×
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-graphite-700">
                  <div
                    className="h-full rounded-sm transition-[width] duration-500"
                    style={{
                      width: `${width}%`,
                      backgroundColor: scarce
                        ? CATEGORY.skills.hex
                        : "#8A93A6",
                    }}
                  />
                </div>
                <p className="mt-1 font-mono text-[0.625rem] tabular-nums text-text-muted/70">
                  {row.openRequests} asking · {row.activeGivers} offering
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
