import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HexMark, cn } from "@buzz/ui";
import { canOpenAdminConsole } from "@buzz/core";
import { api } from "../../lib/trpc/server";
import { AdminTabs } from "../../components/admin/AdminTabs";

/**
 * The unified admin console. One shell, three category-scoped views into
 * the same `posts` data — plus a role gate. Every procedure behind these
 * pages re-checks the role server-side; this layout only stops the wrong
 * person landing on a page full of errors.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Role comes from the database, not the session token — revoking someone's
  // admin role has to take effect immediately, not whenever their JWT
  // happens to expire.
  const caller = await api();
  const me = await caller.profile.me().catch(() => null);
  if (!me) redirect("/login");

  const viewer = {
    id: me.id,
    role: me.role,
    department: me.department,
  };

  const allowed = ["campus", "skills", "builds"].filter((category) =>
    canOpenAdminConsole(viewer, category),
  );

  if (allowed.length === 0) redirect("/feed");

  return (
    <div className="min-h-screen bg-graphite-950">
      <header className="border-b border-graphite-700">
        <div className="shell-column flex h-14 items-center gap-4">
          <Link
            href="/feed"
            className="flex items-center gap-2 text-text-primary-dark transition-opacity hover:opacity-70"
          >
            <HexMark size={16} className="text-campus-ember-500" />
            <span className="font-display text-sm tracking-tight">Buzz</span>
          </Link>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-text-muted">
            admin console
          </span>
          <Link
            href="/feed"
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 text-xs text-text-muted",
              "transition-colors hover:text-text-primary-dark",
            )}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to the feed
          </Link>
        </div>
      </header>

      <div className="shell-column py-8">
        <AdminTabs allowed={allowed} role={viewer.role} />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
