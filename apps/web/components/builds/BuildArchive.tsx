"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import {
  BuildCard,
  Button,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SkillTag,
  Skeleton,
  cn,
} from "@buzz/ui";
import { PIPELINE_LABEL, PIPELINE_ORDER } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

const TYPES = [
  { value: "fyp", label: "Final year project" },
  { value: "startup", label: "Startup" },
  { value: "hackathon", label: "Hackathon" },
  { value: "research", label: "Research" },
];

const ANY = "__any";

/**
 * The public searchable archive — the answer to "every year hundreds of
 * projects get built, presented once, and disappear" (docs/PRD.md §1.3).
 * Filterable by department, year, type, stage and tech tag, and readable
 * without an account.
 */
export function BuildArchive() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [department, setDepartment] = useState<string>(ANY);
  const [year, setYear] = useState<string>(ANY);
  const [type, setType] = useState<string>(ANY);
  const [stage, setStage] = useState<string>(ANY);
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 260);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: facets } = trpc.build.archiveFacets.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const query = trpc.build.archive.useInfiniteQuery(
    {
      search: debounced || undefined,
      department: department === ANY ? undefined : department,
      year: year === ANY ? undefined : Number(year),
      type: type === ANY ? undefined : (type as "fyp"),
      stage: stage === ANY ? undefined : (stage as "idea"),
      tag: tag ?? undefined,
      limit: 18,
    },
    { getNextPageParam: (last) => last.nextCursor ?? undefined, initialCursor: 0 },
  );

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasFilters =
    Boolean(debounced) ||
    department !== ANY ||
    year !== ANY ||
    type !== ANY ||
    stage !== ANY ||
    Boolean(tag);

  function clearAll() {
    setSearch("");
    setDepartment(ANY);
    setYear(ANY);
    setType(ANY);
    setStage(ANY);
    setTag(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects by title or description"
            aria-label="Search the archive"
            className="pl-8"
          />
        </div>

        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-auto min-w-[9rem]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any department</SelectItem>
            {facets?.departments.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-auto min-w-[7rem]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any year</SelectItem>
            {facets?.years.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-auto min-w-[9rem]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-auto min-w-[8rem]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any stage</SelectItem>
            {PIPELINE_ORDER.map((value) => (
              <SelectItem key={value} value={value}>
                {PIPELINE_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-3 w-3" />
            Clear
          </Button>
        ) : null}
      </div>

      {facets && facets.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-text-muted">Tech:</span>
          {facets.tags.slice(0, 14).map((entry) => (
            <button
              key={entry.tag}
              type="button"
              onClick={() => setTag(tag === entry.tag ? null : entry.tag)}
              className={cn(
                "rounded-sm px-1.5 py-0.5 font-mono text-[0.6875rem] lowercase transition-colors",
                tag === entry.tag
                  ? "bg-builds-violet-500 text-paper-100"
                  : "bg-builds-violet-500/10 text-builds-violet-400 hover:bg-builds-violet-500/20",
              )}
            >
              {entry.tag}
              <span className="ml-1 opacity-60">{entry.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {query.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing in the archive matches that"
            description="Try widening the filters, or clear them to browse everything."
            action={
              hasFilters ? (
                <Button variant="quiet" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-3 font-mono text-xs tabular-nums text-text-muted">
              {items.length} project{items.length === 1 ? "" : "s"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((build) => (
                <BuildCard
                  key={build.id}
                  build={{
                    ...build,
                    tags: build.tags ?? [],
                    teamSize: Number(build.teamSize ?? 0),
                    openRoles: Number(build.openRoles ?? 0),
                  }}
                  href={`/builds/${build.id}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {query.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="quiet"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
