import Link from "next/link";
import { Button, HexMark } from "@buzz/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-start justify-center bg-graphite-950 px-6">
      <div className="mx-auto w-full max-w-md">
        <HexMark size={24} className="text-campus-ember-500" />
        <h1 className="mt-6 text-2xl tracking-tight text-text-primary-dark">
          Nothing here
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          This page doesn&apos;t exist — or it&apos;s a sensitive report you
          don&apos;t have access to, which looks exactly the same from out
          here, on purpose.
        </p>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/feed">Back to the feed</Link>
        </Button>
      </div>
    </div>
  );
}
