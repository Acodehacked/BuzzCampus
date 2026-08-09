"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ExternalLink,
  FileText,
  Flag,
  Github,
  Globe,
  Plus,
  Send,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  CATEGORY,
  CreditAmount,
  Field,
  Input,
  LifecycleTimeline,
  SkillTag,
  StatusPill,
  Surface,
  Textarea,
  cn,
  relativeTime,
  type TimelineStep,
} from "@buzz/ui";
import { PIPELINE_LABEL, PIPELINE_ORDER } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";
import { useToast } from "@buzz/ui";

type Build = Awaited<
  ReturnType<ReturnType<typeof trpc.useUtils>["build"]["byId"]["fetch"]>
>;

const TYPE_LABEL: Record<string, string> = {
  fyp: "Final year project",
  startup: "Startup",
  hackathon: "Hackathon",
  research: "Research",
};

export function BuildDetail({ initial }: { initial: Build }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: build = initial } = trpc.build.byId.useQuery(
    { id: initial.id },
    { initialData: initial, staleTime: 15_000 },
  );

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneNote, setMilestoneNote] = useState("");
  const [comment, setComment] = useState("");

  const refresh = () => utils.build.byId.invalidate({ id: build.id });

  const advance = trpc.build.advanceStage.useMutation({
    onSuccess: async (updated) => {
      await refresh();
      toast({
        title: `Moved to ${PIPELINE_LABEL[updated!.pipelineStage]}`,
        description: "Recorded in the project's history.",
        tone: "success",
      });
    },
    onError: (error) =>
      toast({ title: "Couldn't advance", description: error.message, tone: "danger" }),
  });

  const addMilestone = trpc.build.addMilestone.useMutation({
    onSuccess: async () => {
      await refresh();
      setMilestoneTitle("");
      setMilestoneNote("");
      toast({ title: "Milestone logged", tone: "success" });
    },
  });

  const postComment = trpc.build.comment.useMutation({
    onSuccess: async () => {
      await refresh();
      setComment("");
    },
  });

  const stageIndex = PIPELINE_ORDER.indexOf(build.pipelineStage);
  const nextStage = PIPELINE_ORDER[stageIndex + 1];

  // The same LifecycleTimeline component the post pages use — one visual
  // language for "this thing has a state and a history", whether the thing
  // is a broken AC or a startup (docs/DESIGN_SYSTEM.md §5.3).
  const stageSteps: TimelineStep[] = PIPELINE_ORDER.map((stage, index) => {
    const hit = build.stageHistory.find((event) => event.toStatus === stage);
    return {
      key: stage,
      label: PIPELINE_LABEL[stage],
      reached: index <= stageIndex,
      current: stage === build.pipelineStage,
      at: hit?.createdAt ?? null,
      actor: hit?.actorName ?? null,
      note: hit?.note ?? null,
    };
  });

  const openRoles = build.openRoles.filter(
    (role) =>
      (role.metadata as Record<string, unknown> | null)?.kind !== "stage_marker",
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-builds-violet-400">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-sm bg-builds-violet-500"
            />
            {TYPE_LABEL[build.type] ?? build.type}
          </span>
          {build.department ? (
            <Badge tone="muted">{build.department}</Badge>
          ) : null}
          {build.year ? (
            <Badge tone="muted" mono>
              {build.year}
            </Badge>
          ) : null}
        </div>

        <h1 className="mt-3 text-3xl leading-tight tracking-tight text-text-primary-dark">
          {build.title}
        </h1>

        {build.description ? (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
            {build.description}
          </p>
        ) : null}

        {build.tags && build.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {build.tags.map((tag) => (
              <SkillTag key={tag} tag={tag} category="builds" />
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {build.repoUrl ? (
            <Button asChild variant="quiet" size="sm">
              <a href={build.repoUrl} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" />
                Repository
              </a>
            </Button>
          ) : null}
          {build.demoUrl ? (
            <Button asChild variant="quiet" size="sm">
              <a href={build.demoUrl} target="_blank" rel="noreferrer">
                <Globe className="h-3.5 w-3.5" />
                Demo
              </a>
            </Button>
          ) : null}
          {build.reportUrl ? (
            <Button asChild variant="quiet" size="sm">
              <a href={build.reportUrl} target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5" />
                Report
              </a>
            </Button>
          ) : null}
        </div>

        {/* pipeline — same component, same audit trail as every post */}
        <Surface className="mt-8 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-[0.1em] text-text-muted">
              Pipeline
            </h2>
            {build.isTeamMember && nextStage ? (
              <Button
                size="sm"
                variant="primary"
                category="builds"
                loading={advance.isPending}
                onClick={() =>
                  advance.mutate({ buildId: build.id, stage: nextStage })
                }
              >
                Advance to {PIPELINE_LABEL[nextStage]}
              </Button>
            ) : null}
          </div>
          <LifecycleTimeline steps={stageSteps} category="builds" />
        </Surface>

        {/* open roles — plain Asks in the shared feed */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-[0.1em] text-text-muted">
              Open roles
            </h2>
            {build.isTeamMember ? (
              <Button asChild variant="quiet" size="sm">
                <Link href={`/builds/${build.id}/team`}>
                  <Plus className="h-3 w-3" />
                  Post a role
                </Link>
              </Button>
            ) : null}
          </div>

          {openRoles.length === 0 ? (
            <p className="text-sm text-text-muted">
              No open roles right now.
            </p>
          ) : (
            <Surface className="divide-y divide-graphite-700/70">
              {openRoles.map((role) => {
                const metadata = (role.metadata ?? {}) as Record<string, unknown>;
                const tags = Array.isArray(metadata.requiredTags)
                  ? (metadata.requiredTags as string[])
                  : [];
                return (
                  <Link
                    key={role.id}
                    href={`/posts/${role.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-graphite-950/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-text-primary-dark">
                        {role.title}
                      </span>
                      <StatusPill status={role.status} />
                      {metadata.isMentorship ? (
                        <Badge tone="muted">mentorship</Badge>
                      ) : null}
                      {role.creditAmount && Number(role.creditAmount) > 0 ? (
                        <CreditAmount
                          value={role.creditAmount.replace(/\.00$/, "")}
                          className="ml-auto text-sm"
                        />
                      ) : null}
                    </div>
                    {tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <SkillTag key={tag} tag={tag} category="builds" />
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-text-muted">
                      {Number(role.responseCount) || 0} response
                      {Number(role.responseCount) === 1 ? "" : "s"}
                      {" · surfaced in the main feed to people with these skills"}
                    </p>
                  </Link>
                );
              })}
            </Surface>
          )}
        </section>

        {/* milestones */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted">
            Progress log
          </h2>

          {build.isTeamMember ? (
            <Surface className="mb-4 space-y-3 p-4">
              <Field label="Milestone">
                {(id) => (
                  <Input
                    id={id}
                    value={milestoneTitle}
                    onChange={(event) => setMilestoneTitle(event.target.value)}
                    placeholder="Shipped the sensor calibration"
                  />
                )}
              </Field>
              <Field label="Detail" hint="optional">
                {(id) => (
                  <Textarea
                    id={id}
                    value={milestoneNote}
                    onChange={(event) => setMilestoneNote(event.target.value)}
                    className="min-h-[64px]"
                  />
                )}
              </Field>
              <Button
                size="sm"
                variant="primary"
                category="builds"
                disabled={milestoneTitle.trim().length < 3}
                loading={addMilestone.isPending}
                onClick={() =>
                  addMilestone.mutate({
                    buildId: build.id,
                    title: milestoneTitle,
                    note: milestoneNote || undefined,
                  })
                }
              >
                <Flag className="h-3.5 w-3.5" />
                Log it
              </Button>
            </Surface>
          ) : null}

          {build.milestones.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing logged yet.</p>
          ) : (
            <ol className="space-y-0">
              {build.milestones.map((milestone, index) => (
                <li key={milestone.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < build.milestones.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[3px] top-3 h-full w-px bg-graphite-700"
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="relative z-10 mt-1.5 h-[7px] w-[7px] shrink-0 rounded-sm bg-builds-violet-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm text-text-primary-dark">
                        {milestone.title}
                      </span>
                      {milestone.createdAt ? (
                        <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                          {relativeTime(milestone.createdAt)}
                        </time>
                      ) : null}
                    </div>
                    {milestone.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-text-muted">
                        {milestone.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* comments */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted">
            Discussion
          </h2>

          {build.comments.length > 0 ? (
            <ul className="mb-4 space-y-3">
              {build.comments.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <Avatar name={entry.authorName ?? "Someone"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <Link
                        href={`/profile/${entry.authorId}`}
                        className="text-sm text-text-primary-dark hover:underline"
                      >
                        {entry.authorName}
                      </Link>
                      {entry.createdAt ? (
                        <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted">
                          {relativeTime(entry.createdAt)}
                        </time>
                      ) : null}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                      {entry.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Ask about the project, or leave a note for the team."
              className="min-h-[64px]"
            />
            <Button
              variant="quiet"
              className="self-end"
              disabled={comment.trim().length === 0}
              loading={postComment.isPending}
              onClick={() =>
                postComment.mutate({ buildId: build.id, body: comment })
              }
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      </div>

      {/* team rail */}
      <aside className="space-y-4">
        <Surface className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-[0.1em] text-text-muted">
              Team
            </h2>
            {build.isTeamMember ? (
              <Link
                href={`/builds/${build.id}/team`}
                className="text-xs text-text-muted transition-colors hover:text-text-primary-dark"
              >
                Manage
              </Link>
            ) : null}
          </div>

          {build.team.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-text-muted">
              <Users className="h-3 w-3" />
              Nobody on the team yet
            </p>
          ) : (
            <ul className="space-y-2.5">
              {build.team.map((member) => (
                <li key={member.userId}>
                  <Link
                    href={`/profile/${member.userId}`}
                    className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                  >
                    <Avatar name={member.name ?? "Someone"} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-text-primary-dark">
                        {member.name}
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {member.role ?? "Contributor"}
                        {member.department ? ` · ${member.department}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="p-4">
          <h2 className="mb-2 text-xs uppercase tracking-[0.1em] text-text-muted">
            Stage
          </h2>
          <p
            className={cn(
              "font-display text-xl tracking-tight",
              CATEGORY.builds.tagText,
            )}
          >
            {PIPELINE_LABEL[build.pipelineStage]}
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {PIPELINE_ORDER.map((stage, index) => (
              <span
                key={stage}
                className={cn(
                  "h-[3px] flex-1 rounded-sm",
                  index <= stageIndex ? "bg-builds-violet-500" : "bg-graphite-700",
                )}
              />
            ))}
          </div>
          {build.stageHistory.length > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              {build.stageHistory.length} stage change
              {build.stageHistory.length === 1 ? "" : "s"} on record — the same
              append-only history every post on Buzz keeps.
            </p>
          ) : null}
        </Surface>

        {build.repoUrl || build.demoUrl ? (
          <Surface className="p-4">
            <h2 className="mb-2 text-xs uppercase tracking-[0.1em] text-text-muted">
              Links
            </h2>
            <ul className="space-y-1.5 text-xs">
              {[
                { label: "Repository", url: build.repoUrl },
                { label: "Demo", url: build.demoUrl },
                { label: "Report", url: build.reportUrl },
              ]
                .filter((entry) => entry.url)
                .map((entry) => (
                  <li key={entry.label}>
                    <a
                      href={entry.url!}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-text-muted transition-colors hover:text-text-primary-dark"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {entry.label}
                    </a>
                  </li>
                ))}
            </ul>
          </Surface>
        ) : null}
      </aside>
    </div>
  );
}
