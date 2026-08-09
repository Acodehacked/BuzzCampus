import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@buzz/ui";
import { BuildArchive } from "../../../components/builds/BuildArchive";

export const metadata = { title: "Builds" };
export const dynamic = "force-dynamic";

export default function BuildsPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight text-text-primary-dark">
            Builds
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-muted">
            Every project this campus has made, still findable. Final year
            projects, startups, hackathon builds and research — searchable
            long after the team graduates.
          </p>
        </div>
        <Button asChild variant="primary" size="sm">
          <Link href="/builds/new">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Link>
        </Button>
      </div>

      <BuildArchive />
    </div>
  );
}
