"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY, cn, type CategoryKey } from "@buzz/ui";

export function AdminTabs({
  allowed,
  role,
}: {
  allowed: string[];
  role: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-4 border-b border-graphite-700">
      <nav className="flex items-center gap-6">
        {allowed.map((category) => {
          const tokens = CATEGORY[category as CategoryKey];
          const href = `/admin/${category}`;
          const active = pathname === href;
          return (
            <Link
              key={category}
              href={href}
              className={cn(
                "relative -mb-px flex items-center gap-2 border-b-2 pb-2.5 pt-1 text-sm transition-colors",
                active
                  ? "border-current text-text-primary-dark"
                  : "border-transparent text-text-muted hover:text-text-primary-dark",
                active && tokens.text,
              )}
            >
              <span
                aria-hidden
                className={cn("h-1.5 w-1.5 rounded-sm", tokens.dot)}
              />
              <span className={active ? "text-text-primary-dark" : undefined}>
                {tokens.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <span className="pb-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-text-muted">
        {role}
      </span>
    </div>
  );
}
