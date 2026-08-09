"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HexMark, cn } from "@buzz/ui";

/**
 * The lime panel beside the auth form. Desktop only — on a phone it would
 * push the actual form below the fold, which is a real cost for zero gain.
 *
 * The three cards rock gently and continuously. It's the one place on the
 * platform with idle motion, and it earns it: this is a screen people
 * stare at while typing a password, and it's the last thing between them
 * and the product.
 */
export function AuthAside() {
  return (
    <aside className="pop-panel grain relative hidden w-[44%] max-w-xl overflow-hidden bg-pop-lime lg:flex lg:flex-col">
      <div className="relative z-10 flex flex-1 flex-col p-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
        >
          <HexMark size={20} className="text-ink" />
          <span className="font-display text-lg font-bold tracking-tight">
            Buzz
          </span>
        </Link>

        <div className="my-auto py-10">
          <h2 className="display-xl text-4xl xl:text-5xl">
            Everything here
            <br />
            is a favour
            <br />
            worth keeping
            <br />
            track of.
          </h2>

          <div className="mt-12 space-y-3">
            {CARDS.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: [card.tilt, card.tilt + 1.2, card.tilt],
                }}
                transition={{
                  opacity: { duration: 0.4, delay: index * 0.12 },
                  y: {
                    type: "spring",
                    stiffness: 180,
                    damping: 18,
                    delay: index * 0.12,
                  },
                  rotate: {
                    duration: 5 + index,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.3,
                  },
                }}
                className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-4 py-3 shadow-pop-sm"
              >
                <span
                  className={cn("h-9 w-1.5 shrink-0 rounded-full", card.bar)}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{card.title}</p>
                  <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink/50">
                    {card.meta}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/50">
          one feed · one wallet · one score
        </p>
      </div>
    </aside>
  );
}

const CARDS = [
  {
    title: "AC fixed in Block C",
    meta: "campus · verified",
    bar: "bg-campus-ember-500",
    tilt: -1.5,
  },
  {
    title: "React session, 1 hour",
    meta: "skills · 1.5 cr released",
    bar: "bg-skills-teal-500",
    tilt: 1.5,
  },
  {
    title: "EcoTrack found a backend dev",
    meta: "builds · role filled",
    bar: "bg-builds-violet-500",
    tilt: -1,
  },
];
