"use client";

import { Github, Globe, Users } from "lucide-react";
import { cn } from "../utils/cn";
import { CATEGORY } from "../utils/category";
import { SkillTag } from "../primitives/Badge";

const STAGE_ORDER = ["idea", "prototype", "validated", "incubated", "launched"];
const STAGE_LABEL: Record<string, string> = {
  idea: "Idea",
  prototype: "Prototype",
  validated: "Validated",
  incubated: "Incubated",
  launched: "Launched",
};
const TYPE_LABEL: Record<string, string> = {
  fyp: "Final year project",
  startup: "Startup",
  hackathon: "Hackathon",
  research: "Research",
};

export type BuildCardData = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  department?: string | null;
  year?: number | null;
  pipelineStage: string;
  tags?: string[] | null;
  repoUrl?: string | null;
  demoUrl?: string | null;
  teamSize?: number;
  openRoles?: number;
};

/**
 * A Build in the archive. The stage rail is a five-segment bar rather than a
 * badge — the pipeline position is the most useful thing about an archived
 * project, and it should be readable without stopping to parse a word.
 */
export function BuildCard({
  build,
  href,
  className,
}: {
  build: BuildCardData;
  href?: string;
  className?: string;
}) {
  const violet = CATEGORY.builds;
  const stageIndex = STAGE_ORDER.indexOf(build.pipelineStage);
  const Wrapper = href ? "a" : "div";

  return (
    <Wrapper
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-md border border-graphite-700 bg-graphite-800 p-4",
        "light:border-paper-200 light:bg-paper-100",
        "transition-colors duration-150 hover:border-builds-violet-500/50",
        "focus-visible:outline-none focus-visible:border-builds-violet-500",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium leading-snug tracking-tight text-text-primary-dark light:text-text-primary-light">
            {build.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
            <span>{TYPE_LABEL[build.type] ?? build.type}</span>
            {build.department ? <span>· {build.department}</span> : null}
            {build.year ? (
              <span className="font-mono tabular-nums">· {build.year}</span>
            ) : null}
          </p>
        </div>
        {build.openRoles ? (
          <span
            className={cn(
              "shrink-0 rounded-sm px-1.5 py-0.5 text-[0.6875rem]",
              violet.tagBg,
              violet.tagText,
            )}
          >
            {build.openRoles} open {build.openRoles === 1 ? "role" : "roles"}
          </span>
        ) : null}
      </div>

      {build.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-text-muted">
          {build.description}
        </p>
      ) : null}

      {/* the pipeline rail */}
      <div className="mt-auto space-y-1.5">
        <div className="flex gap-1" aria-hidden>
          {STAGE_ORDER.map((stage, index) => (
            <span
              key={stage}
              className={cn(
                "h-[3px] flex-1 rounded-sm transition-colors",
                index <= stageIndex
                  ? "bg-builds-violet-500"
                  : "bg-graphite-700 light:bg-paper-200",
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-builds-violet-400">
            {STAGE_LABEL[build.pipelineStage] ?? build.pipelineStage}
          </span>
          <span className="flex items-center gap-2.5 text-text-muted">
            {build.teamSize ? (
              <span className="inline-flex items-center gap-1 text-[0.6875rem]">
                <Users className="h-3 w-3" />
                {build.teamSize}
              </span>
            ) : null}
            {build.repoUrl ? <Github className="h-3 w-3" /> : null}
            {build.demoUrl ? <Globe className="h-3 w-3" /> : null}
          </span>
        </div>
      </div>

      {build.tags && build.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {build.tags.slice(0, 4).map((tag) => (
            <SkillTag key={tag} tag={tag} category="builds" />
          ))}
        </div>
      ) : null}
    </Wrapper>
  );
}
