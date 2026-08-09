import { ComposeForm } from "../../../../components/compose/ComposeForm";
import { api } from "../../../../lib/trpc/server";
import { auth } from "../../../../server/auth";
import type { CategoryKey } from "@buzz/ui";

export const metadata = { title: "Post something" };
export const dynamic = "force-dynamic";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; buildId?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const caller = await api();

  // Builds posts attach to a project, so the picker needs the projects this
  // person is actually on.
  const builds = session?.user?.id
    ? await caller.build
        .byUser({ userId: session.user.id })
        .then((rows) => rows.map((b) => ({ id: b.id, title: b.title })))
        .catch(() => [])
    : [];

  const category = (["campus", "skills", "builds"] as const).includes(
    params.category as CategoryKey,
  )
    ? (params.category as CategoryKey)
    : undefined;

  return (
    <ComposeForm
      builds={builds}
      defaultCategory={category}
      defaultBuildId={params.buildId}
    />
  );
}
