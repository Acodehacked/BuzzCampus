"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  HandHeart,
  Hammer,
  Lightbulb,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import {
  Button,
  CATEGORY,
  Field,
  Input,
  RadioCard,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SkillTag,
  Surface,
  Switch,
  Textarea,
  cn,
  useToast,
  type CategoryKey,
} from "@buzz/ui";
import { createPostSchema } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

type Step = "intent" | "category" | "details";

/**
 * The one compose flow (docs/PRD.md §2).
 *
 *   Ask or Give → category → the 3–4 fields that category actually needs
 *
 * There is no "report an issue" form, no separate "list a skill" form. Same
 * three steps every time, and the only thing the category changes is which
 * handful of fields appear in step three — which is exactly what the shared
 * `posts` table does underneath.
 */
export function ComposeForm({
  builds,
  defaultCategory,
  defaultBuildId,
}: {
  builds: { id: string; title: string }[];
  defaultCategory?: CategoryKey;
  defaultBuildId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(defaultCategory ? "details" : "intent");
  const [type, setType] = useState<"ask" | "give">("ask");
  const [category, setCategory] = useState<CategoryKey>(
    defaultCategory ?? "campus",
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creditAmount, setCreditAmount] = useState("");

  // campus
  const [locationName, setLocationName] = useState("");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [issueType, setIssueType] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // skills
  const [skillTag, setSkillTag] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");

  // builds
  const [buildId, setBuildId] = useState(defaultBuildId ?? "");
  const [roleNeeded, setRoleNeeded] = useState("");
  const [requiredTags, setRequiredTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isMentorship, setIsMentorship] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: scarcity } = trpc.wallet.scarcity.useQuery(
    { limit: 24 },
    { staleTime: 120_000, enabled: category === "skills" },
  );

  const multiplier = useMemo(() => {
    if (category !== "skills" || !skillTag) return null;
    return (
      scarcity?.rows.find((r) => r.skillTag === skillTag.trim().toLowerCase())
        ?.multiplier ?? null
    );
  }, [category, skillTag, scarcity]);

  const create = trpc.post.create.useMutation({
    onSuccess: async (post) => {
      await utils.post.feed.invalidate();
      await utils.post.counts.invalidate();
      toast({
        title: type === "ask" ? "Ask posted" : "Give posted",
        description: "It's in the feed now, next to everything else.",
        tone: "success",
      });
      router.push(`/posts/${post.id}`);
    },
    onError: (error) => {
      toast({
        title: "Couldn't post that",
        description: error.message,
        tone: "danger",
      });
    },
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoords({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }),
      () =>
        toast({
          title: "Couldn't get your location",
          description: "You can still name the place by hand.",
        }),
    );
  }

  function addTag() {
    const tag = tagDraft.trim().toLowerCase();
    if (!tag || requiredTags.includes(tag) || requiredTags.length >= 6) return;
    setRequiredTags((current) => [...current, tag]);
    setTagDraft("");
  }

  function submit() {
    const payload: Record<string, unknown> = {
      type,
      category,
      title,
      description: description || undefined,
      creditAmount: creditAmount ? Number(creditAmount) : undefined,
    };

    if (category === "campus") {
      Object.assign(payload, {
        locationName: locationName || undefined,
        urgency,
        issueType: issueType || undefined,
        photoUrl: photoUrl || undefined,
        isAnonymous: isAnonymous || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
    }
    if (category === "skills") {
      Object.assign(payload, {
        skillTag: skillTag || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
    }
    if (category === "builds") {
      Object.assign(payload, {
        buildId: buildId || undefined,
        roleNeeded: roleNeeded || undefined,
        requiredTags: requiredTags.length ? requiredTags : undefined,
        isMentorship: isMentorship || undefined,
      });
    }

    // Same Zod schema the server validates with — one source of truth
    // (docs/ARCHITECTURE.md, packages/core/validation).
    const parsed = createPostSchema.safeParse(payload);
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

  const tokens = CATEGORY[category];

  return (
    <div className="mx-auto max-w-2xl">
      <StepRail step={step} />

      {step === "intent" ? (
        <section className="mt-6">
          <h1 className="text-2xl tracking-tight text-text-primary-dark">
            What do you need, or what can you give?
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Everything on Buzz is one of these two. Pick the one that fits.
          </p>

          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as "ask" | "give")}
            className="mt-6 grid gap-3 sm:grid-cols-2"
          >
            <RadioCard
              value="ask"
              title="I need something"
              description="A broken tap, help with calculus, a teammate who knows Arduino."
              icon={<HandHeart className="h-4 w-4" />}
            />
            <RadioCard
              value="give"
              title="I can help with something"
              description="An hour of your time, a skill you have, a hand with a problem."
              icon={<Lightbulb className="h-4 w-4" />}
            />
          </RadioGroup>

          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={() => setStep("category")}>
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "category" ? (
        <section className="mt-6">
          <h1 className="text-2xl tracking-tight text-text-primary-dark">
            Which part of campus?
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            This only decides which few extra fields you get — it all lands in
            the same feed.
          </p>

          <RadioGroup
            value={category}
            onValueChange={(value) => setCategory(value as CategoryKey)}
            className="mt-6 grid gap-3"
          >
            <RadioCard
              value="campus"
              accent="campus"
              title="Campus"
              description={CATEGORY.campus.blurb}
              icon={<MapPin className="h-4 w-4" />}
            />
            <RadioCard
              value="skills"
              accent="skills"
              title="Skills"
              description={CATEGORY.skills.blurb}
              icon={<HandHeart className="h-4 w-4" />}
            />
            <RadioCard
              value="builds"
              accent="builds"
              title="Builds"
              description={CATEGORY.builds.blurb}
              icon={<Hammer className="h-4 w-4" />}
            />
          </RadioGroup>

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep("intent")}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <Button
              variant="primary"
              category={category}
              onClick={() => setStep("details")}
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "details" ? (
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-sm", tokens.dot)} aria-hidden />
            <span className={cn("text-xs uppercase tracking-[0.1em]", tokens.tagText)}>
              {tokens.label} · {type === "ask" ? "Ask" : "Give"}
            </span>
          </div>

          <h1 className="mt-2 text-2xl tracking-tight text-text-primary-dark">
            {type === "ask" ? "What do you need?" : "What can you give?"}
          </h1>

          <div className="mt-6 space-y-5">
            <Field
              label="Title"
              required
              error={errors.title}
              hint={`${title.length}/140`}
            >
              {(id) => (
                <Input
                  id={id}
                  value={title}
                  maxLength={140}
                  onChange={(event) => setTitle(event.target.value)}
                  invalid={Boolean(errors.title)}
                  placeholder={
                    category === "campus"
                      ? "The AC in Block C lecture hall is broken"
                      : category === "skills"
                        ? type === "ask"
                          ? "Need help with thermodynamics before Friday"
                          : "I can teach React — hooks, state, the works"
                        : "EcoTrack needs a backend developer"
                  }
                />
              )}
            </Field>

            <Field label="Details" error={errors.description}>
              {(id) => (
                <Textarea
                  id={id}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Anything that helps whoever picks this up."
                />
              )}
            </Field>

            {/* ── Campus fields ── */}
            {category === "campus" ? (
              <>
                <Field label="Where" required error={errors.locationName}>
                  {(id) => (
                    <div className="flex gap-2">
                      <Input
                        id={id}
                        value={locationName}
                        onChange={(event) => setLocationName(event.target.value)}
                        invalid={Boolean(errors.locationName)}
                        placeholder="Block C, second floor"
                      />
                      <Button
                        type="button"
                        variant="quiet"
                        size="md"
                        onClick={useMyLocation}
                        className="shrink-0"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {coords ? "Pinned" : "Pin me"}
                      </Button>
                    </div>
                  )}
                </Field>

                {coords ? (
                  <p className="-mt-3 font-mono text-[0.6875rem] tabular-nums text-text-muted">
                    {coords.lat}, {coords.lng} — used to surface this to people
                    nearby
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Urgency">
                    {() => (
                      <Select
                        value={urgency}
                        onValueChange={(v) => setUrgency(v as typeof urgency)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low — 5 day SLA</SelectItem>
                          <SelectItem value="medium">Medium — 48 hour SLA</SelectItem>
                          <SelectItem value="high">High — 12 hour SLA</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </Field>

                  <Field label="Kind of issue">
                    {(id) => (
                      <Input
                        id={id}
                        value={issueType}
                        onChange={(event) => setIssueType(event.target.value)}
                        placeholder="Electrical, plumbing, furniture…"
                      />
                    )}
                  </Field>
                </div>

                <Field label="Photo URL" hint="optional" error={errors.photoUrl}>
                  {(id) => (
                    <Input
                      id={id}
                      value={photoUrl}
                      onChange={(event) => setPhotoUrl(event.target.value)}
                      placeholder="https://…"
                      invalid={Boolean(errors.photoUrl)}
                    />
                  )}
                </Field>

                <Surface className="flex items-start gap-3 p-3.5">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-campus-ember-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="anonymous"
                        className="text-sm text-text-primary-dark"
                      >
                        Sensitive report
                      </label>
                      <Switch
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={setIsAnonymous}
                      />
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      Goes only to the Safety Officer. Your name is never
                      attached — not for staff, not for platform admins.
                    </p>
                  </div>
                </Surface>
              </>
            ) : null}

            {/* ── Skills fields ── */}
            {category === "skills" ? (
              <>
                <Field
                  label="Skill"
                  required
                  error={errors.skillTag}
                  hint="one tag, lowercase"
                >
                  {(id) => (
                    <>
                      <Input
                        id={id}
                        value={skillTag}
                        onChange={(event) => setSkillTag(event.target.value)}
                        invalid={Boolean(errors.skillTag)}
                        placeholder="react, thermodynamics, figma…"
                      />
                      {scarcity && scarcity.rows.length > 0 && !skillTag ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {scarcity.rows.slice(0, 8).map((row) => (
                            <SkillTag
                              key={row.skillTag}
                              tag={row.skillTag}
                              onClick={() => setSkillTag(row.skillTag)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </Field>

                {multiplier !== null ? (
                  <p className="-mt-3 font-mono text-xs tabular-nums text-skills-teal-400">
                    {skillTag} is trading at {multiplier.toFixed(2)}× right now
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="How long" hint="minutes">
                    {(id) => (
                      <Input
                        id={id}
                        mono
                        type="number"
                        min={10}
                        max={480}
                        step={15}
                        value={durationMinutes}
                        onChange={(event) => setDurationMinutes(event.target.value)}
                      />
                    )}
                  </Field>

                  <Field
                    label="Credits"
                    error={errors.creditAmount}
                    hint={type === "ask" ? "you pay" : "you earn"}
                  >
                    {(id) => (
                      <Input
                        id={id}
                        mono
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={creditAmount}
                        onChange={(event) => setCreditAmount(event.target.value)}
                        placeholder="1.5"
                      />
                    )}
                  </Field>
                </div>

                {creditAmount && Number(creditAmount) > 0 ? (
                  <p className="-mt-3 flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    Credits lock in escrow when this is accepted, and release
                    when you both confirm it's done.
                  </p>
                ) : null}
              </>
            ) : null}

            {/* ── Builds fields ── */}
            {category === "builds" ? (
              <>
                <Field label="Project" required error={errors.buildId}>
                  {() => (
                    <Select value={buildId} onValueChange={setBuildId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Which project is this for?" />
                      </SelectTrigger>
                      <SelectContent>
                        {builds.length === 0 ? (
                          <SelectItem value="none" disabled>
                            You&apos;re not on a project yet
                          </SelectItem>
                        ) : (
                          builds.map((build) => (
                            <SelectItem key={build.id} value={build.id}>
                              {build.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field label="Role needed">
                  {(id) => (
                    <Input
                      id={id}
                      value={roleNeeded}
                      onChange={(event) => setRoleNeeded(event.target.value)}
                      placeholder="Backend developer, embedded engineer…"
                    />
                  )}
                </Field>

                <Field
                  label="Skills it needs"
                  hint="this is how the right people find it"
                >
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
                          placeholder="arduino, postgres, figma…"
                        />
                        <Button type="button" variant="quiet" onClick={addTag}>
                          Add
                        </Button>
                      </div>
                      {requiredTags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {requiredTags.map((tag) => (
                            <SkillTag
                              key={tag}
                              tag={`${tag} ×`}
                              category="builds"
                              onClick={() =>
                                setRequiredTags((current) =>
                                  current.filter((t) => t !== tag),
                                )
                              }
                            />
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                        People who&apos;ve offered these skills will see this
                        in their feed. No separate teammate search needed.
                      </p>
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
                        value={creditAmount}
                        onChange={(event) => setCreditAmount(event.target.value)}
                      />
                    )}
                  </Field>

                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2.5 text-sm text-text-muted">
                      <Switch
                        checked={isMentorship}
                        onCheckedChange={setIsMentorship}
                      />
                      Mentorship request
                    </label>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep(defaultCategory ? "intent" : "category")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <Button
              variant="primary"
              category={category}
              onClick={submit}
              loading={create.isPending}
            >
              Post {type === "ask" ? "Ask" : "Give"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepRail({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "intent", label: "Ask or Give" },
    { key: "category", label: "Category" },
    { key: "details", label: "Details" },
  ];
  const index = steps.findIndex((s) => s.key === step);

  return (
    <ol className="flex items-center gap-2">
      {steps.map((entry, i) => (
        <li key={entry.key} className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[0.6875rem] uppercase tracking-[0.1em]",
              i <= index ? "text-text-primary-dark" : "text-text-muted/50",
            )}
          >
            {entry.label}
          </span>
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className={cn(
                "h-px w-6",
                i < index ? "bg-text-primary-dark" : "bg-graphite-700",
              )}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
