import Link from "next/link";
import { Button, HexMark } from "@buzz/ui";
import { auth } from "../../server/auth";
import { LightMode } from "../../components/public/LightMode";

/**
 * The public shell.
 *
 * The nav is a floating ink pill rather than a full-width bar: the pages
 * underneath are full-bleed colour panels, and a solid header strip would
 * cut every one of them in half. Floating it lets the panels run edge to
 * edge, which is the whole look.
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
        <header className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
          <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-2 rounded-full border-2 border-ink bg-ink/95 px-2 py-2 text-white shadow-pop backdrop-blur-sm">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-white/10"
            >
              <HexMark size={17} className="text-pop-lime" />
              <span className="font-display text-base font-bold tracking-tight">
                Buzz
              </span>
            </Link>

            <Link
              href="/trust"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Trust
            </Link>
            <Link
              href="/builds"
              className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:block"
            >
              Projects
            </Link>

            <div className="ml-auto flex items-center gap-1.5">
              {session?.user ? (
                <Button asChild variant="pop-light" size="sm">
                  <Link href="/feed">Open the feed</Link>
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Sign in
                  </Link>
                  <Button asChild variant="pop-light" size="sm">
                    <Link href="/register">Join</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {children}

        <footer className="border-t-2 border-ink bg-ink text-white">
          <div className="shell-column flex flex-wrap items-center justify-between gap-4 py-10">
            <div>
              <div className="flex items-center gap-2">
                <HexMark size={16} className="text-pop-lime" />
                <span className="font-display text-sm font-bold">Buzz</span>
              </div>
              <p className="mt-2 text-xs text-white/50">
                One campus feed. Ask for help, give a hand.
              </p>
            </div>
            <nav className="flex flex-wrap gap-5 text-xs text-white/60">
              <Link href="/trust" className="hover:text-pop-lime">
                Trust dashboard
              </Link>
              <Link href="/builds" className="hover:text-pop-lime">
                Project archive
              </Link>
              <Link href="/login" className="hover:text-pop-lime">
                Sign in
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}
