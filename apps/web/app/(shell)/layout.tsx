import { redirect } from "next/navigation";
import { api } from "../../lib/trpc/server";
import { ShellNav } from "../../components/shell/ShellNav";

/**
 * The authenticated app shell. Dark mode is the default here and there's no
 * light-mode toggle for it — light is reserved for the public-facing pages
 * (docs/DESIGN_SYSTEM.md §6).
 *
 * The viewer comes from profile.me rather than straight off the session
 * token, so the shell trusts the same database-checked identity that every
 * procedure behind it enforces — including the name and role, which a
 * long-lived JWT can otherwise hold stale.
 */
export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caller = await api();
  const me = await caller.profile.me().catch(() => null);

  if (!me) redirect("/login");

  return (
    <div className="min-h-screen bg-graphite-950">
      <ShellNav
        user={{
          id: me.id,
          name: me.name ?? "You",
          role: me.role,
          department: me.department,
        }}
      />
      <main className="shell-column pb-24 pt-6">{children}</main>
    </div>
  );
}
