"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY, SectionHeading, Skeleton, Surface } from "@buzz/ui";
import { trpc } from "../../lib/trpc/client";

const AXIS = { fill: "#8A93A6", fontSize: 11 };
const TOOLTIP_STYLE = {
  background: "#181D24",
  border: "1px solid #232A34",
  borderRadius: 6,
  fontSize: 12,
  color: "#F5F6F7",
};

/**
 * Skills admin — is the credit economy healthy?
 *
 * The two failure modes worth watching for: credits pooling in a few
 * wallets while everyone else sits at their starter grant, and the scarcity
 * index flattening out (which means it has stopped saying anything).
 */
export function SkillsConsole() {
  const { data, isLoading } = trpc.admin.skills.useQuery();

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full rounded-md" />;
  }

  const teal = CATEGORY.skills.hex;
  const idleShare =
    data.money.wallets === 0
      ? 0
      : Math.round((data.money.idleWallets / data.money.wallets) * 100);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="In circulation"
          value={data.money.inCirculation.replace(/\.00$/, "")}
          detail={`across ${data.money.wallets} wallets`}
        />
        <Stat
          label="Held in escrow"
          value={data.money.inEscrow.replace(/\.00$/, "")}
          detail="committed to work in progress"
        />
        <Stat
          label="Index spread"
          value={`${data.spread.toFixed(2)}×`}
          detail={
            data.spread < 0.3
              ? "flat — the index isn't discriminating"
              : "healthy variation across skills"
          }
        />
        <Stat
          label="Never traded"
          value={`${idleShare}%`}
          detail={`${data.money.idleWallets} wallets still at their starter grant`}
        />
      </div>

      <section>
        <SectionHeading
          title="Supply and demand"
          description={`${data.supply.openAsks} open asks · ${data.supply.openGives} open offers · ${data.supply.inFlight} in flight · ${data.supply.completed} completed`}
        />
        <Surface className="p-5">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.scarcity}
                margin={{ top: 4, right: 8, bottom: 32, left: -22 }}
              >
                <CartesianGrid stroke="#232A34" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="skillTag"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: "#232A34" }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={56}
                />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "#181D24" }}
                  formatter={(value: number, name: string) => [
                    name === "multiplier" ? `${value.toFixed(2)}×` : value,
                    name,
                  ]}
                />
                <Bar dataKey="multiplier" radius={[3, 3, 0, 0]} maxBarSize={30}>
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
        </Surface>
      </section>

      {data.velocity.length > 0 ? (
        <section>
          <SectionHeading
            title="Credit velocity"
            description="Credits actually changing hands per day. A stalled line means people are earning but never spending."
          />
          <Surface className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.velocity.map((row) => ({
                    day: row.day,
                    moved: Number(row.moved),
                  }))}
                  margin={{ top: 4, right: 8, bottom: 0, left: -22 }}
                >
                  <CartesianGrid stroke="#232A34" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={AXIS}
                    tickLine={false}
                    axisLine={{ stroke: "#232A34" }}
                    tickFormatter={(value: string) => value.slice(5)}
                    minTickGap={24}
                  />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="moved"
                    stroke={teal}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Surface>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Surface className="p-4">
      <p className="text-xs uppercase tracking-[0.1em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl tabular-nums leading-none text-text-primary-dark">
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{detail}</p>
    </Surface>
  );
}
