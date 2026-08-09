import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuildDetail } from "../../../../components/builds/BuildDetail";
import { api } from "../../../../lib/trpc/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const caller = await api();
    const build = await caller.build.byId({ id });
    return { title: build.title, description: build.description ?? undefined };
  } catch {
    return { title: "Project" };
  }
}

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = await api();
  const build = await caller.build.byId({ id }).catch(() => null);
  if (!build) notFound();

  return <BuildDetail initial={build} />;
}
