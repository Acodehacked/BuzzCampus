"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Field,
  Input,
  RadioCard,
  RadioGroup,
  SkillTag,
  Surface,
  Textarea,
  useToast,
} from "@buzz/ui";
import { createBuildSchema } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

const TYPES = [
  {
    value: "fyp",
    title: "Final year project",
    description: "The thing you'll be graded on, and remembered for.",
  },
  {
    value: "startup",
    title: "Startup",
    description: "Something you intend to keep going after the semester.",
  },
  {
    value: "hackathon",
    title: "Hackathon build",
    description: "48 hours of work that deserves to survive the weekend.",
  },
  {
    value: "research",
    title: "Research",
    description: "A paper, a study, an experiment worth finding again.",
  },
];

export function NewBuildForm({ department }: { department?: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [type, setType] = useState("fyp");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dept, setDept] = useState(department ?? "");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = trpc.build.create.useMutation({
    onSuccess: async (build) => {
      await utils.build.archive.invalidate();
      toast({
        title: "Project created",
        description: "Add your team and post the roles you're missing.",
        tone: "success",
      });
      router.push(`/builds/${build.id}/team`);
    },
    onError: (error) =>
      toast({ title: "Couldn't create that", description: error.message, tone: "danger" }),
  });

  function addTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || tags.includes(tag) || tags.length >= 10) return;
    setTags((current) => [...current, tag]);
    setTagDraft("");
  }

  function submit() {
    const parsed = createBuildSchema.safeParse({
      title,
      description: description || undefined,
      type,
      department: dept || undefined,
      year: year ? Number(year) : undefined,
      tags: tags.length ? tags : undefined,
      repoUrl: repoUrl || undefined,
      demoUrl: demoUrl || undefined,
      reportUrl: reportUrl || undefined,
    });

    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!flat[key]) flat[key] = issue.message;
      }
      setErrors(flat);
      return;
    }

    setErrors({});
    create.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl tracking-tight text-text-primary-dark">
        Put a project on the record
      </h1>
      <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-text-muted">
        Once it&apos;s here it stays findable — after the demo, after the
        submission, after you graduate.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.08em] text-text-muted">
            What kind of project
          </p>
          <RadioGroup
            value={type}
            onValueChange={setType}
            className="grid gap-3 sm:grid-cols-2"
          >
            {TYPES.map((option) => (
              <RadioCard
                key={option.value}
                value={option.value}
                accent="builds"
                title={option.title}
                description={option.description}
              />
            ))}
          </RadioGroup>
        </div>

        <Field label="Title" required error={errors.title}>
          {(id) => (
            <Input
              id={id}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              invalid={Boolean(errors.title)}
              placeholder="EcoTrack — campus energy monitoring"
            />
          )}
        </Field>

        <Field label="What it is" error={errors.description}>
          {(id) => (
            <Textarea
              id={id}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[120px]"
              placeholder="What problem it solves, how it works, where it got to."
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" error={errors.department}>
            {(id) => (
              <Input
                id={id}
                value={dept}
                onChange={(event) => setDept(event.target.value)}
                placeholder="Computer Science"
              />
            )}
          </Field>
          <Field label="Year" error={errors.year}>
            {(id) => (
              <Input
                id={id}
                mono
                type="number"
                min={2000}
                max={new Date().getFullYear() + 2}
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Tech and domain tags" hint="how people will find this later">
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
                  placeholder="iot, react, sustainability…"
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

        <Surface className="space-y-4 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-text-muted">
            Links
          </p>
          <Field label="Repository" error={errors.repoUrl}>
            {(id) => (
              <Input
                id={id}
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                placeholder="https://github.com/…"
                invalid={Boolean(errors.repoUrl)}
              />
            )}
          </Field>
          <Field label="Demo" error={errors.demoUrl}>
            {(id) => (
              <Input
                id={id}
                value={demoUrl}
                onChange={(event) => setDemoUrl(event.target.value)}
                placeholder="https://…"
                invalid={Boolean(errors.demoUrl)}
              />
            )}
          </Field>
          <Field label="Report / paper" error={errors.reportUrl}>
            {(id) => (
              <Input
                id={id}
                value={reportUrl}
                onChange={(event) => setReportUrl(event.target.value)}
                placeholder="https://…"
                invalid={Boolean(errors.reportUrl)}
              />
            )}
          </Field>
        </Surface>

        <div className="flex justify-end">
          <Button
            variant="primary"
            category="builds"
            loading={create.isPending}
            onClick={submit}
          >
            Create project
          </Button>
        </div>
      </div>
    </div>
  );
}
