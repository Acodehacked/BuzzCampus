"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORY,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@buzz/ui";
import { PIPELINE_LABEL } from "@buzz/core/client";
import { trpc } from "../../lib/trpc/client";

const AXIS = { fill: "#8A93A6", fontSize: 11 };
const GRID = "#ECEAE4";

const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #ECEAE4",
  borderRadius: 6,
  fontSize: 12,
  color: "#14181C",
};

/**
 * The public Trust dashboard (docs/PRD.md §6.1 #5).
 *
 * A real dashboard grid — not a centred column of cards. Each tab answers
 * one question about whether the campus actually works, with the number
 * that answers it given room and the supporting chart underneath.
 */
export function TrustDashboard() {
  return (
    <Tabs defaultValue="campus">
      <TabsList>
        <TabsTrigger value="campus">Campus</TabsTrigger>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="builds">Builds</TabsTrigger>
        <TabsTrigger value="platform">Platform</TabsTrigger>
      </TabsList>

      <TabsContent value="campus" className="pt-8">
        <CampusTab />
      </TabsContent>
      <TabsContent value="skills" className="pt-8">
        <SkillsTab />
      </TabsContent>
      <TabsContent value="builds" className="pt-8">
        <BuildsTab />
      </TabsContent>
      <TabsContent value="platform" className="pt-8">
        <PlatformTab />
      </TabsContent>
    </Tabs>
  );
}

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-paper-200 bg-paper-100 p-5",
        className,
      )}
    >
      <h3 className="text-sm font-medium tracking-tight text-text-primary-light">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          {description}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Headline({
  value,
  label,
  detail,
  accent,
}: {
  value: string;
  label: string;
  detail?: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.1em] text-text-muted">
        {label}
      </p>
      <p
        className="mt-2 font-mono text-4xl tabular-nums leading-none"
        style={{ color: accent ?? "#14181C" }}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs leading-relaxed text-text-muted">{detail}</p>
      ) : null}
    </div>
  );
}

function CampusTab() {
  const { data } = trpc.trust.campus.useQuery();
  if (!data) return <Loading />;

  const ember = CATEGORY.campus.hex;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-md border border-paper-200 bg-paper-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Headline
          value={`${data.resolutionRate}%`}
          label="Resolved"
          detail={`${data.resolved} of ${data.total} reports closed and verified`}
          accent={ember}
        />
        <Headline
          value={`${data.slaComplianceRate}%`}
          label="Within SLA"
          detail="Closed inside the window its urgency promised"
        />
        <Headline
          value={`${data.medianHours}h`}
          label="Median time to fix"
          detail={`Mean ${data.avgHours}h — the median is the honest one`}
        />
        <Headline
          value={String(data.open + data.inFlight)}
          label="Still open"
          detail={`${data.open} unclaimed, ${data.inFlight} being worked on`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title="Reported vs resolved"
          description="Last 30 days. Reports that came in, and how many of them closed."
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.trend}
                margin={{ top: 4, right: 8, bottom: 0, left: -22 }}
              >
                <defs>
                  <linearGradient id="reported" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ember} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={ember} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tickFormatter={(value: string) => value.slice(5)}
                  minTickGap={24}
                />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="reported"
                  stroke={ember}
                  strokeWidth={1.5}
                  fill="url(#reported)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22C55E"
                  strokeWidth={1.5}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="By kind of issue"
          description="Where the reports actually come from."
        >
          <ul className="space-y-3">
            {data.byType.map((row) => {
              const rate =
                row.total === 0
                  ? 0
                  : Math.round((Number(row.resolved) / Number(row.total)) * 100);
              return (
                <li key={row.issueType}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs capitalize text-text-primary-light">
                      {row.issueType}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-text-muted">
                      {row.resolved}/{row.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-sm bg-paper-200">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${rate}%`, backgroundColor: ember }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function SkillsTab() {
  const { data } = trpc.trust.skills.useQuery();
  if (!data) return <Loading />;

  const teal = CATEGORY.skills.hex;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-md border border-paper-200 bg-paper-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Headline
          value={String(data.completed)}
          label="Sessions completed"
          detail="Accepted, worked, and confirmed by both sides"
          accent={teal}
        />
        <Headline
          value={data.creditsMoved.replace(/\.00$/, "")}
          label="Credits moved"
          detail={`Across ${data.transfers} released escrows`}
        />
        <Headline
          value={`${data.scarcitySpread.toFixed(2)}×`}
          label="Index spread"
          detail="Gap between the scarcest and most abundant skill"
        />
        <Headline
          value={`${data.asks}/${data.gives}`}
          label="Asks vs gives"
          detail="A healthy economy needs both sides to show up"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="Scarcity Index"
          description="Live credit multiplier per skill, from asks against offers. Above 1.00× means teaching it right now earns more."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.scarcity}
                margin={{ top: 4, right: 8, bottom: 30, left: -22 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="skillTag"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={54}
                />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "dataMax + 0.4"]}
                />
                <RechartsTooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "#F7F6F3" }}
                  formatter={(value: number) => [`${value.toFixed(2)}×`, "Multiplier"]}
                />
                <Bar dataKey="multiplier" radius={[3, 3, 0, 0]} maxBarSize={34}>
                  {data.scarcity.map((row) => (
                    <Cell
                      key={row.skillTag}
                      fill={row.multiplier >= 1 ? teal : "#8A93A6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Supply and demand"
          description="Who's asking, who's offering, per skill."
        >
          <ul className="space-y-2.5">
            {data.topTags.map((row) => {
              const total = Number(row.asks) + Number(row.gives);
              const askShare = total === 0 ? 50 : (Number(row.asks) / total) * 100;
              return (
                <li key={row.tag}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-mono text-xs lowercase text-text-primary-light">
                      {row.tag}
                    </span>
                    <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-text-muted">
                      {row.asks} ask · {row.gives} give
                    </span>
                  </div>
                  <div className="mt-1 flex h-1 overflow-hidden rounded-sm bg-paper-200">
                    <span
                      className="h-full"
                      style={{ width: `${askShare}%`, backgroundColor: "#8A93A6" }}
                    />
                    <span
                      className="h-full"
                      style={{ width: `${100 - askShare}%`, backgroundColor: teal }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function BuildsTab() {
  const { data } = trpc.trust.builds.useQuery();
  if (!data) return <Loading />;

  const violet = CATEGORY.builds.hex;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-md border border-paper-200 bg-paper-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Headline
          value={String(data.total)}
          label="Projects archived"
          detail="Still findable, long after the team graduated"
          accent={violet}
        />
        <Headline
          value={String(
            data.funnel.find((s) => s.stage === "prototype")?.reached ?? 0,
          )}
          label="Past the idea stage"
          detail="Projects that actually got built"
        />
        <Headline
          value={String(data.openRoles)}
          label="Open roles"
          detail="Live in the main feed right now"
        />
        <Headline
          value={String(data.rolesFilled)}
          label="Teammates found"
          detail="Through the shared feed — no separate matching tool"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="Pipeline funnel"
          description="How far projects get. Each step counts everything at or beyond that stage."
        >
          <ul className="space-y-3">
            {data.funnel.map((step) => (
              <li key={step.stage}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-text-primary-light">
                    {PIPELINE_LABEL[step.stage]}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-muted">
                    {step.reached}
                    <span className="ml-1.5 opacity-60">{step.share}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-paper-200">
                  <div
                    className="h-full rounded-sm transition-[width] duration-500"
                    style={{
                      width: `${step.share}%`,
                      backgroundColor: violet,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="By department" description="Where the work is happening.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.byDepartment}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
              >
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  width={96}
                />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#F7F6F3" }} />
                <Bar dataKey="count" fill={violet} radius={[0, 3, 3, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PlatformTab() {
  const { data } = trpc.trust.platform.useQuery();
  const { data: leaders } = trpc.profile.leaderboard.useQuery();
  if (!data) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-8 rounded-md border border-paper-200 bg-paper-100 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-text-muted">
            Active in 2+ categories
          </p>
          <p className="mt-2 font-mono text-6xl tabular-nums leading-none text-text-primary-light">
            {data.adoption.rate}%
          </p>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-text-muted">
            {data.adoption.multiCategoryUsers} of{" "}
            {data.adoption.activeUsers} people who have completed anything have
            done so in more than one category. This is the number that decides
            whether one shared feed was the right call.
          </p>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.activity}
              margin={{ top: 4, right: 8, bottom: 0, left: -22 }}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="day"
                tick={AXIS}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                tickFormatter={(value: string) => value.slice(5)}
                minTickGap={24}
              />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="campus"
                stackId="1"
                stroke={CATEGORY.campus.hex}
                fill={CATEGORY.campus.hex}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="skills"
                stackId="1"
                stroke={CATEGORY.skills.hex}
                fill={CATEGORY.skills.hex}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="builds"
                stackId="1"
                stroke={CATEGORY.builds.hex}
                fill={CATEGORY.builds.hex}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {leaders && leaders.length > 0 ? (
        <Panel
          title="Most contribution, campus-wide"
          description="One score. Points from a repaired AC and a taught tutorial count the same."
        >
          <ul className="divide-y divide-paper-200">
            {leaders.map((person, index) => (
              <li
                key={person.userId}
                className="flex items-center gap-4 py-2.5"
              >
                <span className="w-5 font-mono text-xs tabular-nums text-text-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary-light">
                    {person.name}
                  </span>
                  {person.department ? (
                    <span className="block text-xs text-text-muted">
                      {person.department}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {person.categories}{" "}
                  {person.categories === 1 ? "category" : "categories"}
                </span>
                <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums text-text-primary-light">
                  {person.total}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse-soft rounded-md border border-paper-200 bg-paper-100"
        />
      ))}
    </div>
  );
}
