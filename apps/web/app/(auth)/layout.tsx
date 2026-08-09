import Link from "next/link";
import { HexMark } from "@buzz/ui";

/**
 * Auth pages keep the dark app-shell register — you're signing into the
 * product, not browsing the public site.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-graphite-950">
      <header className="border-b border-graphite-700">
        <div className="shell-column flex h-16 items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-primary-dark transition-opacity hover:opacity-70"
          >
            <HexMark size={18} className="text-campus-ember-500" />
            <span className="font-display text-base tracking-tight">Buzz</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
