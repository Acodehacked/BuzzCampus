import { notFound, redirect } from "next/navigation";
import { TeamManager } from "../../../../../components/builds/TeamManager";
import { api } from "../../../../../lib/trpc/server";

export const metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = await api();
  const build = await caller.build.byId({ id }).catch(() => null);
  if (!build) notFound();

  // Team management is team-only. The mutations enforce this again on the
  // server; this is just so the wrong person doesn't get a dead page.
  if (!build.isTeamMember) redirect(`/builds/${id}`);

  return (
    <TeamManager
      buildId={build.id}
      buildTitle={build.title}
      team={build.team.map((member) => ({
        userId: member.userId,
        name: member.name,
        role: member.role,
      }))}
    />
  );
}
