"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CATEGORY } from "../utils/category";
import { cn } from "../utils/cn";

/**
 * The honeycomb motif — docs/DESIGN_SYSTEM.md §5, signature moment 1.
 * LANDING PAGE ONLY. Three hexagonal cells, one per category colour,
 * settling into a single cluster: three problems, one hive. Do not repeat
 * this anywhere else in the app — used twice it stops meaning anything.
 *
 * Three distinct solid hexagons is the one sanctioned place all three
 * category colours appear together (§4).
 */

// A pointy-top hexagon, 46 wide × 52 tall.
const HEX_PATH = "M 26 0 L 49 13 L 49 39 L 26 52 L 3 39 L 3 13 Z";

// Pointy-top hexes tessellate at (±46, 0) and (±23, ±39) — anything else
// leaves them overlapping instead of interlocking, which rather undermines
// "three cells forming one honeycomb". One on top, two below.
const CELLS = [
  {
    key: "campus" as const,
    // final position in the cluster
    x: 23,
    y: 0,
    // where it flies in from
    fromX: 23,
    fromY: -44,
    delay: 0,
  },
  { key: "skills" as const, x: 46, y: 39, fromX: 96, fromY: 62, delay: 0.09 },
  { key: "builds" as const, x: 0, y: 39, fromX: -50, fromY: 62, delay: 0.18 },
];

// Cluster spans x 0…95, y 0…91, plus a little breathing room for strokes.
const VIEW_BOX = "-6 -6 107 103";
const ASPECT = 103 / 107;

export function Honeycomb({
  className,
  size = 168,
}: {
  className?: string;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox={VIEW_BOX}
      width={size}
      height={size * ASPECT}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Three hexagonal cells — Campus, Skills and Builds — forming one honeycomb"
    >
      {CELLS.map((cell) => {
        const tokens = CATEGORY[cell.key];
        return (
          <motion.g
            key={cell.key}
            initial={
              reduceMotion
                ? { opacity: 1, x: cell.x, y: cell.y }
                : { opacity: 0, x: cell.fromX, y: cell.fromY, scale: 0.82 }
            }
            animate={{ opacity: 1, x: cell.x, y: cell.y, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 22,
              mass: 0.8,
              delay: reduceMotion ? 0 : 0.15 + cell.delay,
            }}
          >
            <path
              d={HEX_PATH}
              fill={tokens.hex}
              fillOpacity={0.14}
              stroke={tokens.hex}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <circle cx={26} cy={26} r={3.5} fill={tokens.hex} />
          </motion.g>
        );
      })}
    </svg>
  );
}

/**
 * A single hex used as a small structural mark (the nav logo). This is the
 * same geometry at a glance-sized scale, not a repeat of the motif above —
 * one cell, not the cluster.
 */
export function HexMark({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 52 52"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <path
        d={HEX_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <circle cx={26} cy={26} r={6} fill="currentColor" />
    </svg>
  );
}
