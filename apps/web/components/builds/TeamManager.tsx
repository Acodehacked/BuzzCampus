"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Sparkles, Trash2, UserPlus } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Input,
  SectionHeading,
  SkillTag,
  Surface,
  Switch,
  Textarea,
  useToast,
} from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

/**
 * Team + open roles.
 *
 * The suggestion list here is worth reading closely: it's a query over the
 * *same* Skills posts that drive the feed ranking. There is no separate
 * matching service — posting the role is what surfaces it to these people,
 * and this panel just shows you who that will be (docs/PRD.md Flow C).
 */
export function TeamManager({
  buildId,
  buildTitle,
  team,
}: {
  buildId: string;
  buildTitle: string;
  team: { userId: string; name: string | null; role: string | null }[];
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [roleNeeded, setRoleNeeded] = useState("");
  const [description, setDescription] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [credits, setCredits] = useState("");
  const [isMentorship, setIsMentorship] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const { data: candidates } = trpc.build.suggestTeammates.useQuery(
    { tags },
    { enabled: tags.length > 0, staleTime: 60_000 },
  );

  const { data: people } = trpc.build.searchUsers.useQuery(
    { query: memberSearch },
    { enabled: memberSearch.trim().length >= 2 },
  );

  const refresh = () => utils.build.byId.invalidate({ id: buildId });

  const createRole = trpc.build.createOpenRole.useMutation({
    onSuccess: async () => {
      await Promise.all([refresh(), utils.post.feed.invalidate()]);
      setRoleNeeded("");
      setDescription("");
      setTags([]);
      setCredits("");
      toast({
        title: "Role posted",
        description:
          "It's in the main feed now, ranked toward people who offer these skills.",
        tone: "success",
      });
    },
    onError: (error) =>
      toast({ title: "Couldn't post that", description: error.message, tone: "danger" }),
  });

  const addMember = trpc.build.addTeamMember.useMutation({
    onSuccess: async () => {
      await refresh();
      setMemberSearch("");
      toast({ title: "Added to the team", tone: "success" });
    },
  });

  const removeMember = trpc.build.removeTeamMember.useMutation({
    onSuccess: () => void refresh(),
  });

  function addTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || tags.includes(tag) || tags.length >= 6) return;
    setTags((current) => [...current, tag]);
    setTagDraft("");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/builds/${buildId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary-dark"
      >
        <ArrowLeft className="h-3 w-3" />
        {buildTitle}
      </Link>

      <h1 className="text-2xl tracking-tight text-text-primary-dark">
        Team &amp; open roles
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* ── team ── */}
        <section>
          <SectionHeading title="Team" />
          <Surface className="divide-y divide-graphite-700/70">
            {team.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Avatar name={member.name ?? "Someone"} size="sm" />
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${member.userId}`}
                    className="block truncate text-sm text-text-primary-dark hover:underline"
                  >
                    {member.name}
                  </Link>
                  <span className="block text-xs text-text-muted">
                    {member.role ?? "Contributor"}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${member.name}`}
                  onClick={() =>
                    removeMember.mutate({ buildId, userId: member.userId })
                  }
                  className="rounded-sm p-1.5 text-text-muted transition-colors hover:bg-danger-500/10 hover:text-danger-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </Surface>

          <div className="mt-4 space-y-2">
            <Field label="Add someone">
              {(id) => (
                <Input
                  id={id}
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Search by name or campus email"
                />
              )}
            </Field>

            {people && people.length > 0 ? (
              <Surface className="divide-y divide-graphite-700/70">
                {people
                  .filter((person) => !team.some((m) => m.userId === person.id))
                  .map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <Avatar name={person.name} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text-primary-dark">
                          {person.name}
                        </span>
                        <span className="block truncate font-mono text-[0.6875rem] text-text-muted">
                          {person.email}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="quiet"
                        loading={addMember.isPending}
                        onClick={() =>
                          addMember.mutate({ buildId, userId: person.id })
                        }
                      >
                        <UserPlus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  ))}
              </Surface>
            ) : null}
          </div>
        </section>

        {/* ── open role ── */}
        <section>
          <SectionHeading
            title="Post an open role"
            description="This creates an ordinary Ask in the shared feed."
          />

          <Surface className="space-y-4 p-4">
            <Field label="Role" required>
              {(id) => (
                <Input
                  id={id}
                  value={roleNeeded}
                  onChange={(event) => setRoleNeeded(event.target.value)}
                  placeholder="Backend developer"
                />
              )}
            </Field>

            <Field label="What they'd be doing" hint="optional">
              {(id) => (
                <Textarea
                  id={id}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[72px]"
                />
              )}
            </Field>

            <Field label="Skills needed" required>
              {(id) => (
                <>
                  <div className="flex gap-2">
                    <Input
                      id={id}
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="postgres, arduino, figma…"
                    />
                    <Button type="button" variant="quiet" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <SkillTag
                          key={tag}
                          tag={`${tag} ×`}
                          category="builds"
                          onClick={() =>
                            setTags((current) => current.filter((t) => t !== tag))
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Credits" hint="optional">
                {(id) => (
                  <Input
                    id={id}
                    mono
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={credits}
                    onChange={(event) => setCredits(event.target.value)}
                  />
                )}
              </Field>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2.5 text-sm text-text-muted">
                  <Switch
                    checked={isMentorship}
                    onCheckedChange={setIsMentorship}
                  />
                  Mentorship
                </label>
              </div>
            </div>

            <Button
              variant="primary"
              category="builds"
              className="w-full justify-center"
              disabled={roleNeeded.trim().length < 2 || tags.length === 0}
              loading={createRole.isPending}
              onClick={() =>
                createRole.mutate({
                  buildId,
                  roleNeeded,
                  description: description || undefined,
                  requiredTags: tags,
                  creditAmount: credits ? Number(credits) : undefined,
                  isMentorship,
                })
              }
            >
              Post to the feed
            </Button>
          </Surface>

          {/* who this will reach */}
          {tags.length > 0 ? (
            <div className="mt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-text-muted">
                <Sparkles className="h-3 w-3" />
                Who this will surface to
              </h3>
              {!candidates || candidates.length === 0 ? (
                <p className="text-xs leading-relaxed text-text-muted">
                  Nobody has offered {tags.join(" or ")} in Skills yet. The role
                  will still appear in everyone&apos;s feed — it just
                  won&apos;t be boosted for anyone in particular.
                </p>
              ) : (
                <Surface className="divide-y divide-graphite-700/70">
                  {candidates.map((person) => (
                    <Link
                      key={person.userId}
                      href={`/profile/${person.userId}`}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-graphite-950/40"
                    >
                      <Avatar name={person.name ?? "Someone"} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text-primary-dark">
                          {person.name}
                        </span>
                        <span className="flex flex-wrap gap-1 pt-0.5">
                          {(person.matchedTags ?? []).slice(0, 3).map((tag) => (
                            <SkillTag key={tag} tag={tag} />
                          ))}
                        </span>
                      </span>
                      <Badge tone="muted" mono>
                        {person.score}
                      </Badge>
                    </Link>
                  ))}
                </Surface>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
