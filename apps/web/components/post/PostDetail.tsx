"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUp,
  Check,
  Clock,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  CategoryTag,
  CreditAmount,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  LifecycleTimeline,
  MetaItem,
  SkillTag,
  StatusPill,
  Surface,
  Textarea,
  TypeMark,
  categoryTokens,
  cn,
  relativeTime,
  useToast,
  type TimelineStep,
} from "@buzz/ui";
import { STATUS_LABEL, STATUS_ORDER } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

type PostDetailData = NonNullable<
  Awaited<ReturnType<ReturnType<typeof trpc.useUtils>["post"]["byId"]["fetch"]>>
>;

export function PostDetail({
  initial,
  viewerId,
  viewerRole,
}: {
  initial: PostDetailData;
  viewerId: string;
  viewerRole: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: post = initial } = trpc.post.byId.useQuery(
    { id: initial.id },
    { initialData: initial, staleTime: 10_000 },
  );

  const [note, setNote] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  const tokens = categoryTokens(post.category);
  const metadata = (post.metadata ?? {}) as Record<string, unknown>;

  const refresh = async () => {
    await Promise.all([
      utils.post.byId.invalidate({ id: post.id }),
      utils.post.feed.invalidate(),
      utils.wallet.summary.invalidate(),
    ]);
  };

  const transition = trpc.post.transition.useMutation({
    onSuccess: async (result) => {
      await refresh();
      setNote("");
      setVerifyOpen(false);
      const moved = result.credits;
      toast({
        title: `Moved to ${STATUS_LABEL[result.post.status]}`,
        description: moved
          ? moved.movement === "locked"
            ? `${moved.amount} credits held in escrow`
            : moved.movement === "released"
              ? `${moved.amount} credits released`
              : `${moved.amount} credits refunded`
          : undefined,
        tone: "success",
      });
      if (result.post.status === "verified") setReviewOpen(true);
    },
    onError: (error) =>
      toast({ title: "Couldn't do that", description: error.message, tone: "danger" }),
  });

  const respond = trpc.post.respond.useMutation({
    onSuccess: async () => {
      await refresh();
      setOfferMessage("");
      toast({
        title: "Offer sent",
        description: "They'll see it on their post and can accept it.",
        tone: "success",
      });
    },
    onError: (error) =>
      toast({ title: "Couldn't send that", description: error.message, tone: "danger" }),
  });

  const acceptResponse = trpc.post.acceptResponse.useMutation({
    onSuccess: async (result) => {
      await refresh();
      toast({
        title: "Accepted",
        description: result.credits
          ? `${result.credits.amount} credits are now held in escrow`
          : "They're on it.",
        tone: "success",
      });
    },
    onError: (error) =>
      toast({ title: "Couldn't accept", description: error.message, tone: "danger" }),
  });

  const review = trpc.post.review.useMutation({
    onSuccess: async () => {
      await refresh();
      setReviewOpen(false);
      toast({ title: "Thanks — that counts toward their Buzz Score", tone: "success" });
    },
  });

  const upvote = trpc.post.upvote.useMutation({
    onSuccess: () => void refresh(),
  });

  // The timeline is built from the real audit trail, not from the current
  // status alone — every step shows who moved it and when.
  const steps: TimelineStep[] = buildSteps(post);
  const acceptedResponse = post.responses.find((r) => r.status === "accepted");
  const isHelper = acceptedResponse?.responderId === viewerId;
  const canRespond =
    !post.isAuthor &&
    !post.viewerResponse &&
    ["open", "reopened"].includes(post.status);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0">
        {/* header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CategoryTag category={post.category} />
          <TypeMark type={post.type} />
          <StatusPill status={post.status} />
          {post.isAnonymous ? (
            <Badge tone="danger">
              <ShieldAlert className="h-3 w-3" />
              Sensitive
            </Badge>
          ) : null}
          <span className="ml-auto font-mono text-[0.6875rem] tabular-nums text-text-muted/60">
            {post.id.slice(0, 8)}
          </span>
        </div>

        <h1 className="mt-3 text-2xl leading-tight tracking-tight text-text-primary-dark">
          {post.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2">
            <Avatar name={post.author.name} size="xs" />
            {post.author.id ? (
              <Link
                href={`/profile/${post.author.id}`}
                className="text-sm text-text-muted transition-colors hover:text-text-primary-dark"
              >
                {post.author.name}
              </Link>
            ) : (
              <span className="text-sm italic text-text-muted">
                {post.author.name}
              </span>
            )}
          </span>
          {post.createdAt ? (
            <time className="font-mono text-xs tabular-nums text-text-muted">
              {relativeTime(post.createdAt)}
            </time>
          ) : null}
          {post.locationName ? (
            <MetaItem icon={<MapPin className="h-3 w-3" />}>
              {post.locationName}
            </MetaItem>
          ) : null}
          {post.buildTitle && post.buildId ? (
            <Link
              href={`/builds/${post.buildId}`}
              className={cn("text-xs transition-opacity hover:opacity-70", tokens.tagText)}
            >
              {post.buildTitle}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => upvote.mutate({ postId: post.id })}
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-xs tabular-nums transition-colors",
              post.hasUpvoted
                ? cn("border-transparent", tokens.tagBg, tokens.tagText)
                : "border-graphite-700 text-text-muted hover:text-text-primary-dark",
            )}
          >
            <ArrowUp className="h-3 w-3" />
            {post.upvoteCount}
          </button>
        </div>

        {post.description ? (
          <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
            {post.description}
          </p>
        ) : null}

        {/* category-specific detail */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {typeof metadata.skillTag === "string" ? (
            <SkillTag tag={metadata.skillTag} />
          ) : null}
          {Array.isArray(metadata.requiredTags)
            ? (metadata.requiredTags as string[]).map((tag) => (
                <SkillTag key={tag} tag={tag} category="builds" />
              ))
            : null}
          {typeof metadata.durationMinutes === "number" ? (
            <MetaItem icon={<Clock className="h-3 w-3" />}>
              {metadata.durationMinutes} min
            </MetaItem>
          ) : null}
          {typeof metadata.roleNeeded === "string" ? (
            <Badge tone="neutral">{metadata.roleNeeded}</Badge>
          ) : null}
          {typeof metadata.issueType === "string" ? (
            <Badge tone="muted">{metadata.issueType}</Badge>
          ) : null}
        </div>

        {typeof metadata.photoUrl === "string" && metadata.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={metadata.photoUrl}
            alt="Reported issue"
            className="mt-5 max-h-80 w-full rounded-md border border-graphite-700 object-cover"
          />
        ) : null}

        {/* THE shared timeline — identical component on every post, whatever
            the category (docs/DESIGN_SYSTEM.md §5.3). */}
        <Surface className="mt-8 p-5">
          <h2 className="mb-5 text-xs uppercase tracking-[0.1em] text-text-muted">
            Lifecycle
          </h2>
          <LifecycleTimeline
            steps={steps}
            category={post.category}
            derailed={
              post.status === "reopened"
                ? { status: "reopened", label: "Reopened — the fix didn't hold" }
                : post.status === "cancelled"
                  ? { status: "cancelled", label: "Cancelled" }
                  : null
            }
          />

          {post.sla ? (
            <div className="mt-5 border-t border-graphite-700 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-muted">
                  SLA · {post.sla.hours}h from report
                </span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    post.sla.severity === "breached" && "text-danger-500",
                    post.sla.severity === "warning" && "text-warning-500",
                    post.sla.severity === "ok" && "text-success-500",
                  )}
                >
                  {post.sla.label}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-sm bg-graphite-700">
                <div
                  className={cn(
                    "h-full rounded-sm transition-[width] duration-500",
                    post.sla.severity === "breached"
                      ? "bg-danger-500"
                      : post.sla.severity === "warning"
                        ? "bg-warning-500"
                        : "bg-success-500",
                  )}
                  style={{ width: `${Math.round(post.sla.elapsedFraction * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </Surface>

        {/* the audit trail, in full */}
        {post.history.length > 0 ? (
          <Surface className="mt-4 p-5">
            <h2 className="mb-4 text-xs uppercase tracking-[0.1em] text-text-muted">
              History
              <span className="ml-2 normal-case tracking-normal text-text-muted/60">
                append-only
              </span>
            </h2>
            <LifecycleTimeline
              orientation="vertical"
              category={post.category}
              steps={post.history.map((event) => ({
                key: event.id,
                label:
                  event.fromStatus == null
                    ? "Posted"
                    : `${STATUS_LABEL[event.fromStatus as keyof typeof STATUS_LABEL] ?? event.fromStatus} → ${
                        STATUS_LABEL[event.toStatus as keyof typeof STATUS_LABEL] ??
                        event.toStatus
                      }`,
                reached: true,
                current: false,
                at: event.createdAt,
                actor: event.actorName,
                note: event.note,
              }))}
            />
          </Surface>
        ) : null}

        {/* responses */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted">
            {post.responses.length} {post.responses.length === 1 ? "offer" : "offers"}
          </h2>

          {post.responses.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nobody has offered yet.
            </p>
          ) : (
            <ul className="divide-y divide-graphite-700/70">
              {post.responses.map((offer) => (
                <li
                  key={offer.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <Avatar name={offer.responderName ?? "Someone"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${offer.responderId}`}
                      className="text-sm text-text-primary-dark hover:underline"
                    >
                      {offer.responderName ?? "Someone"}
                    </Link>
                    {offer.message ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                        {offer.message}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    tone={
                      offer.status === "accepted"
                        ? "success"
                        : offer.status === "declined"
                          ? "muted"
                          : "neutral"
                    }
                  >
                    {offer.status}
                  </Badge>
                  {post.isAuthor && offer.status === "proposed" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      category={post.category as never}
                      loading={acceptResponse.isPending}
                      onClick={() =>
                        acceptResponse.mutate({ responseId: offer.id })
                      }
                    >
                      Accept
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canRespond ? (
            <div className="mt-4 space-y-2">
              <Textarea
                value={offerMessage}
                onChange={(event) => setOfferMessage(event.target.value)}
                placeholder={
                  post.type === "ask"
                    ? "Say how you can help, and when."
                    : "Say what you'd like help with."
                }
                className="min-h-[72px]"
              />
              <Button
                variant="primary"
                category={post.category as never}
                loading={respond.isPending}
                onClick={() =>
                  respond.mutate({
                    postId: post.id,
                    message: offerMessage || undefined,
                  })
                }
              >
                {post.type === "ask" ? "I can help" : "I'm interested"}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {/* ── action rail ── */}
      <aside className="space-y-4">
        <Surface className="p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted">
            What happens next
          </h2>

          {post.creditAmount && Number(post.creditAmount) > 0 ? (
            <div className="mb-4 flex items-baseline justify-between border-b border-graphite-700 pb-3">
              <span className="text-xs text-text-muted">Credits</span>
              <CreditAmount
                value={post.creditAmount.replace(/\.00$/, "")}
                className="text-lg text-text-primary-dark"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            {post.availableTransitions.includes("in_progress") &&
            (isHelper || post.isAuthor || viewerRole === "staff") ? (
              <ActionButton
                label="Start work"
                category={post.category}
                loading={transition.isPending}
                onClick={() =>
                  transition.mutate({ postId: post.id, toStatus: "in_progress" })
                }
              />
            ) : null}

            {post.availableTransitions.includes("fulfilled") &&
            (isHelper || post.isAuthor || viewerRole === "staff") ? (
              <ActionButton
                label="Mark as done"
                category={post.category}
                loading={transition.isPending}
                onClick={() =>
                  transition.mutate({
                    postId: post.id,
                    toStatus: "fulfilled",
                    note: note || undefined,
                  })
                }
              />
            ) : null}

            {post.availableTransitions.includes("verified") &&
            (post.isAuthor || viewerRole === "admin" ||
              (post.category === "campus" && viewerRole === "staff")) ? (
              <Button
                variant="primary"
                category={post.category as never}
                className="w-full justify-center"
                onClick={() => setVerifyOpen(true)}
              >
                <Check className="h-3.5 w-3.5" />
                Verify &amp; close
              </Button>
            ) : null}

            {post.availableTransitions.includes("reopened") && post.isAuthor ? (
              <Button
                variant="quiet"
                className="w-full justify-center"
                loading={transition.isPending}
                onClick={() =>
                  transition.mutate({
                    postId: post.id,
                    toStatus: "reopened",
                    note: "Not resolved properly",
                  })
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen
              </Button>
            ) : null}

            {post.availableTransitions.includes("cancelled") && post.isAuthor ? (
              <Button
                variant="danger"
                className="w-full justify-center"
                loading={transition.isPending}
                onClick={() =>
                  transition.mutate({ postId: post.id, toStatus: "cancelled" })
                }
              >
                <X className="h-3.5 w-3.5" />
                Cancel this
              </Button>
            ) : null}

            {post.availableTransitions.length === 0 ? (
              <p className="text-xs leading-relaxed text-text-muted">
                This one&apos;s closed. The history above is permanent.
              </p>
            ) : null}
          </div>

          {post.status === "verified" && !post.hasReviewed && !post.isAuthor === false ? (
            <Button
              variant="quiet"
              className="mt-3 w-full justify-center"
              onClick={() => setReviewOpen(true)}
            >
              <Star className="h-3.5 w-3.5" />
              Leave a review
            </Button>
          ) : null}
        </Surface>

        {acceptedResponse ? (
          <Surface className="p-4">
            <h2 className="mb-2 text-xs uppercase tracking-[0.1em] text-text-muted">
              Working on it
            </h2>
            <Link
              href={`/profile/${acceptedResponse.responderId}`}
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Avatar name={acceptedResponse.responderName ?? "Someone"} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-text-primary-dark">
                  {acceptedResponse.responderName}
                </span>
                <span className="block text-xs text-text-muted">
                  {acceptedResponse.responderDepartment ?? "Accepted"}
                </span>
              </span>
            </Link>
          </Surface>
        ) : null}
      </aside>

      {/* Verify dialog — Campus demands an after-photo before it can close. */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify and close</DialogTitle>
            <DialogDescription>
              {post.category === "campus"
                ? "Campus reports close with proof — add a photo of the fix."
                : "Confirming releases any held credits and records the contribution for both of you."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {post.category === "campus" ? (
              <Field label="After photo URL" required>
                {(id) => (
                  <Input
                    id={id}
                    value={afterPhoto}
                    onChange={(event) => setAfterPhoto(event.target.value)}
                    placeholder="https://…"
                  />
                )}
              </Field>
            ) : null}

            <Field label="Note" hint="optional">
              {(id) => (
                <Textarea
                  id={id}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Anything worth recording in the history."
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setVerifyOpen(false)}>
              Not yet
            </Button>
            <Button
              variant="primary"
              category={post.category as never}
              loading={transition.isPending}
              disabled={post.category === "campus" && !afterPhoto}
              onClick={() =>
                transition.mutate({
                  postId: post.id,
                  toStatus: "verified",
                  note: note || undefined,
                  attachmentUrl: afterPhoto || undefined,
                  counterpartyId: acceptedResponse?.responderId ?? undefined,
                })
              }
            >
              Verify &amp; close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How did it go?</DialogTitle>
            <DialogDescription>
              This feeds their one Buzz Score — the same score whether they
              fixed a tap or taught you thermodynamics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  className="rounded-sm p-1 transition-colors hover:bg-graphite-700"
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      value <= rating
                        ? "fill-warning-500 text-warning-500"
                        : "text-text-muted/40",
                    )}
                  />
                </button>
              ))}
            </div>

            <Field label="Comment" hint="optional">
              {(id) => (
                <Textarea
                  id={id}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Skip
            </Button>
            <Button
              variant="primary"
              loading={review.isPending}
              disabled={!acceptedResponse?.responderId && post.isAuthor}
              onClick={() => {
                const revieweeId = post.isAuthor
                  ? acceptedResponse?.responderId
                  : post.author.id;
                if (!revieweeId) return;
                review.mutate({
                  postId: post.id,
                  revieweeId,
                  rating,
                  comment: reviewComment || undefined,
                });
              }}
            >
              Post review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButton({
  label,
  category,
  loading,
  onClick,
}: {
  label: string;
  category: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      className="w-full justify-center"
      loading={loading}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** Builds the five happy-path steps, marking what the history actually reached. */
function buildSteps(post: {
  status: string;
  history: { toStatus: string | null; createdAt: Date | null; actorName: string }[];
}): TimelineStep[] {
  const reachedAt = new Map<string, { at: Date | null; actor: string }>();
  for (const event of post.history) {
    if (event.toStatus && !reachedAt.has(event.toStatus)) {
      reachedAt.set(event.toStatus, {
        at: event.createdAt,
        actor: event.actorName,
      });
    }
  }

  const currentIndex = STATUS_ORDER.indexOf(post.status as never);

  return STATUS_ORDER.map((status, index) => {
    const hit = reachedAt.get(status);
    return {
      key: status,
      label: STATUS_LABEL[status],
      reached: Boolean(hit) || (currentIndex >= 0 && index <= currentIndex),
      current: post.status === status,
      at: hit?.at ?? null,
      actor: hit?.actor ?? null,
    };
  });
}
