import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HexMark } from "@buzz/ui";
import { AuthAside } from "../../components/auth/AuthAside";

/**
 * Auth is a split: a loud panel carrying the promise, and a calm column
 * carrying the form.
 *
 * Putting the form ON a saturated panel — which the reference does — works
 * for a phone, where the form is three fields on its own screen. On a
 * desktop it turns a password field into hard work. So the colour keeps
 * the continuity from the landing page, and the inputs keep their
 * contrast.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-graphite-950 lg:flex-row">
      <AuthAside />

      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 pt-6 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-primary-dark transition-opacity hover:opacity-70 lg:hidden"
          >
            <HexMark size={18} className="text-pop-lime" />
            <span className="font-display text-base font-bold tracking-tight">
              Buzz
            </span>
          </Link>

          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-graphite-800 hover:text-text-primary-dark"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
