"use client";

import {
  ArrowUp,
  Clock,
  MapPin,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { categoryTokens } from "../utils/category";
import {
  CategoryTag,
  CreditAmount,
  MetaItem,
  SkillTag,
  StatusPill,
  TypeMark,
} from "../primitives/Badge";

/**
 * The card that carries the whole product.
 *
 * docs/DESIGN_SYSTEM.md §4: a small category tag and a hairline accent edge
 * — deliberately NOT a full background tint, so a mixed feed reads as one
 * list rather than three sub-apps interleaved. The feed is a dense,
 * left-aligned list (§3, last row), not a grid of floating cards.
 */

export type PostCardData = {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string | null;
  status: string;
  creditAmount?: string | null;
  locationName?: string | null;
  isAnonymous?: boolean;
  upvoteCount?: number;
  createdAt?: Date | string | null;
  author: { id: string | null; name: string; department?: string | null };
  metadata?: Record<string, unknown> | null;
  responseCount?: number;
  buildTitle?: string | null;
  /** the quiet one-liner explaining why this ranked where it did */
  rankReason?: string | null;
  sla?: { label: string; severity: "ok" | "warning" | "breached" } | null;
};

export function PostCard({
  post,
  href,
  onUpvote,
  hasUpvoted,
  compact,
  className,
  children,
}: {
  post: PostCardData;
  href?: string;
  onUpvote?: () => void;
  hasUpvoted?: boolean;
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const tokens = categoryTokens(post.category);
  const metadata = (post.metadata ?? {}) as Record<string, unknown>;
  const skillTag = typeof metadata.skillTag === "string" ? metadata.skillTag : null;
  const roleNeeded =
    typeof metadata.roleNeeded === "string" ? metadata.roleNeeded : null;
  const requiredTags = Array.isArray(metadata.requiredTags)
    ? (metadata.requiredTags as string[])
    : [];
  const urgency = typeof metadata.urgency === "string" ? metadata.urgency : null;
  const isMentorship = metadata.isMentorship === true;

  const Wrapper = href ? "a" : "div";

  return (
    <article
      className={cn(
        "group relative isolate",
        "border-b border-graphite-700/70 last:border-b-0",
        "transition-colors duration-150 hover:bg-graphite-800/40",
        className,
      )}
    >
      {/* the category accent edge — 2px, full height, no tint behind it */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-0 h-full w-[2px] opacity-70",
          tokens.edge,
        )}
      />

      <Wrapper
        href={href}
        className={cn(
          "block pl-4 pr-3 focus-visible:outline-none focus-visible:bg-graphite-800/60",
          compact ? "py-3" : "py-4",
          "sm:pl-5",
        )}
      >
        {/* line 1 — the scannable header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CategoryTag category={post.category} size="sm" />
          <TypeMark type={post.type} />
          <StatusPill status={post.status} />

          {urgency === "high" ? (
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-campus-ember-500">
              urgent
            </span>
          ) : null}
          {isMentorship ? (
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-builds-violet-400">
              mentorship
            </span>
          ) : null}

          <span className="ml-auto flex items-center gap-3">
            {post.sla ? (
              <MetaItem
                icon={<Clock className="h-3 w-3" />}
                className={cn(
                  post.sla.severity === "breached" && "text-danger-500",
                  post.sla.severity === "warning" && "text-warning-500",
                )}
              >
                <span className="font-mono tabular-nums">{post.sla.label}</span>
              </MetaItem>
            ) : null}
            {post.creditAmount && Number(post.creditAmount) > 0 ? (
              <CreditAmount
                value={formatCreditValue(post.creditAmount)}
                className="text-sm text-text-primary-dark"
              />
            ) : null}
          </span>
        </div>

        {/* line 2 — the thing itself */}
        <h3
          className={cn(
            "mt-2 text-[0.9375rem] font-medium leading-snug tracking-tight text-text-primary-dark",
            "group-hover:text-white",
          )}
        >
          {post.title}
        </h3>

        {post.description && !compact ? (
          <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            {post.description}
          </p>
        ) : null}

        {/* line 3 — category-specific detail, only what that category needs */}
        {(skillTag || requiredTags.length > 0 || roleNeeded) && !compact ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {roleNeeded ? (
              <MetaItem icon={<Users className="h-3 w-3" />}>
                <span className="text-text-primary-dark">{roleNeeded}</span>
              </MetaItem>
            ) : null}
            {skillTag ? <SkillTag tag={skillTag} category="skills" /> : null}
            {requiredTags.map((tag) => (
              <SkillTag key={tag} tag={tag} category="builds" />
            ))}
          </div>
        ) : null}

        {/* line 4 — attribution and signals */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-text-muted">
            {post.isAnonymous ? (
              <span className="italic">Anonymous report</span>
            ) : (
              post.author.name
            )}
            {post.author.department && !post.isAnonymous ? (
              <span className="text-text-muted/60"> · {post.author.department}</span>
            ) : null}
          </span>

          {post.createdAt ? (
            <time className="font-mono text-[0.6875rem] tabular-nums text-text-muted/70">
              {relativeTime(post.createdAt)}
            </time>
          ) : null}

          {post.locationName ? (
            <MetaItem icon={<MapPin className="h-3 w-3" />}>
              {post.locationName}
            </MetaItem>
          ) : null}

          {post.buildTitle ? (
            <MetaItem>
              <span className={tokens.tagText}>{post.buildTitle}</span>
            </MetaItem>
          ) : null}

          {post.responseCount ? (
            <MetaItem icon={<MessageSquare className="h-3 w-3" />}>
              {post.responseCount}
            </MetaItem>
          ) : null}

          {post.rankReason ? (
            <MetaItem
              icon={<Sparkles className="h-3 w-3" />}
              className="text-text-muted/70"
            >
              {post.rankReason}
            </MetaItem>
          ) : null}
        </div>

        {children}
      </Wrapper>

      {onUpvote ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onUpvote();
          }}
          aria-pressed={hasUpvoted}
          aria-label={`Upvote ${post.title}`}
          className={cn(
            "absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-sm px-1.5 py-1",
            "font-mono text-[0.6875rem] tabular-nums transition-colors duration-150",
            hasUpvoted
              ? cn(tokens.tagBg, tokens.tagText)
              : "text-text-muted hover:bg-graphite-700 hover:text-text-primary-dark",
          )}
        >
          <ArrowUp className="h-3 w-3" />
          {post.upvoteCount ?? 0}
        </button>
      ) : null}
    </article>
  );
}

function formatCreditValue(value: string): string {
  return value.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function relativeTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
