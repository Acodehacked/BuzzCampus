"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import {
  ActivityPulse,
  Avatar,
  Badge,
  Button,
  CreditAmount,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HexMark,
  cn,
} from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";
import { useActivityStream } from "../../lib/useActivityStream";
import { NotificationPanel } from "./NotificationPanel";

const NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/builds", label: "Builds" },
  { href: "/wallet", label: "Wallet" },
  { href: "/trust", label: "Trust" },
];

export function ShellNav({
  user,
}: {
  user: { id: string; name: string; role: string; department: string | null };
}) {
  const pathname = usePathname();
  const { items, live } = useActivityStream();
  const { data: me } = trpc.profile.me.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: notifications } = trpc.account.notifications.useQuery(
    { limit: 12 },
    { staleTime: 30_000 },
  );

  const canAdmin = ["admin", "staff", "safety", "mentor"].includes(user.role);

  return (
    <header className="sticky top-0 z-40 border-b border-graphite-700 bg-graphite-950/95 backdrop-blur-[2px]">
      <div className="shell-column flex h-14 items-center gap-1">
        <Link
          href="/feed"
          className="mr-4 flex items-center gap-2 text-text-primary-dark transition-opacity hover:opacity-80"
        >
          <HexMark size={17} className="text-campus-ember-500" />
          <span className="font-display text-base tracking-tight">Buzz</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-sm px-2.5 py-1.5 text-sm transition-colors duration-150",
                  active
                    ? "bg-graphite-800 text-text-primary-dark"
                    : "text-text-muted hover:text-text-primary-dark",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ActivityPulse items={items} live={live} />

          <Link
            href="/feed?q="
            aria-label="Search the feed"
            className="hidden rounded-sm p-2 text-text-muted transition-colors hover:bg-graphite-800 hover:text-text-primary-dark sm:inline-flex"
          >
            <Search className="h-4 w-4" />
          </Link>

          <NotificationPanel items={notifications ?? []}>
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-sm p-2 text-text-muted transition-colors hover:bg-graphite-800 hover:text-text-primary-dark"
            >
              <Bell className="h-4 w-4" />
              {notifications && notifications.length > 0 ? (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-campus-ember-500"
                />
              ) : null}
            </button>
          </NotificationPanel>

          {/* The global "+ Post" stays neutral — it isn't category-specific
              (docs/DESIGN_SYSTEM.md §4). */}
          <Button asChild variant="primary" size="sm" className="ml-1">
            <Link href="/post/new">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Post</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-muted"
                aria-label="Your account"
              >
                <Avatar name={user.name} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate text-sm normal-case tracking-normal text-text-primary-dark">
                  {user.name}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <Badge tone="muted" className="capitalize">
                    {user.role}
                  </Badge>
                  {me?.balance ? (
                    <CreditAmount
                      value={me.balance.replace(/\.00$/, "")}
                      className="text-xs"
                    />
                  ) : null}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user.id}`}>
                  <User className="h-3.5 w-3.5" />
                  Your profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wallet">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet &amp; ledger
                </Link>
              </DropdownMenuItem>
              {canAdmin ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      user.role === "mentor" ? "/admin/builds" : "/admin/campus"
                    }
                  >
                    {user.role === "safety" ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <LayoutDashboard className="h-3.5 w-3.5" />
                    )}
                    Admin console
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                danger
                onSelect={() => void signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
