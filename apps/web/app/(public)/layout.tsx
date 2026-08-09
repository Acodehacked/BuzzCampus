import Link from "next/link";
import { Button, HexMark } from "@buzz/ui";
import { auth } from "../../server/auth";
import { LightMode } from "../../components/public/LightMode";

/**
 * The public shell. Light mode lives here and only here — landing, Trust
 * and the Builds archive are what a prospective student, parent or judge
 * sees without an account, and a warmer register suits that audience
 * (docs/DESIGN_SYSTEM.md §6).
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <>
      <LightMode />
      <div className="min-h-screen bg-paper-50 text-text-primary-light">
        <header className="border-b border-paper-200">
          <div className="shell-column flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-70"
            >
              <HexMark size={18} className="text-campus-ember-500" />
              <span className="font-display text-base tracking-tight">Buzz</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/trust"
                className="rounded-sm px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text-primary-light"
              >
                Trust
              </Link>
              {session?.user ? (
                <Button asChild variant="primary" size="sm" className="ml-2">
                  <Link href="/feed">Open the feed</Link>
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-sm px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text-primary-light"
                  >
                    Sign in
                  </Link>
                  <Button asChild variant="primary" size="sm" className="ml-2">
                    <Link href="/register">Join</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>

        {children}

        <footer className="mt-24 border-t border-paper-200">
          <div className="shell-column flex flex-wrap items-center justify-between gap-4 py-8">
            <p className="text-xs text-text-muted">
              Buzz — one campus feed. Ask for help, give a hand.
            </p>
            <nav className="flex gap-4 text-xs text-text-muted">
              <Link href="/trust" className="hover:text-text-primary-light">
                Trust dashboard
              </Link>
              <Link href="/login" className="hover:text-text-primary-light">
                Sign in
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
