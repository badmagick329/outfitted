"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  date: string;
  label: string;
  costMicrousd: number;
  requestCount: number;
};

function formatUsd(microusd: number) {
  const dollars = microusd / 1_000_000;
  if (dollars === 0) return "$0";
  if (dollars < 0.0001) return `$${dollars.toFixed(6)}`;
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

type MemberSeries = { userId: string; name: string | null; email: string; data: ChartPoint[] };
const comparisonColors = ["#9f275a", "#176b67", "#945113", "#4c469a", "#126c94", "#a83725"];
const maxComparisonMembers = 6;

export function AiUsageChart({ data, members }: { data: ChartPoint[]; members: MemberSeries[] }) {
  const [view, setView] = useState<"combined" | "comparison">("combined");
  const [search, setSearch] = useState("");
  const [comparedIds, setComparedIds] = useState(() =>
    [...members]
      .sort(
        (left, right) =>
          right.data.reduce((sum, day) => sum + day.costMicrousd, 0) -
          left.data.reduce((sum, day) => sum + day.costMicrousd, 0),
      )
      .slice(0, maxComparisonMembers)
      .map((member) => member.userId),
  );
  const comparedMembers = comparedIds
    .map((id) => members.find((member) => member.userId === id)!)
    .filter(Boolean);
  const comparisonData = data.map((day, index) => ({
    ...day,
    values: Object.fromEntries(
      comparedMembers.map((member) => [member.userId, member.data[index]?.costMicrousd ?? 0]),
    ),
  }));
  const visibleMembers = members.filter((member) =>
    `${member.name ?? ""} ${member.email}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Cost chart view">
        {(["combined", "comparison"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={`min-h-11 rounded-xl border border-line px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${view === option ? "bg-berry text-canvas" : "bg-canvas text-ink/65"}`}
          >
            {option === "combined" ? "Combined spend" : "Compare members"}
          </button>
        ))}
      </div>
      {view === "comparison" && (
        <div className="mb-5 rounded-xl border border-line bg-mist/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">Compare up to {maxComparisonMembers} members</p>
            <button
              type="button"
              onClick={() => setComparedIds([])}
              className="min-h-11 text-xs font-bold text-berry underline underline-offset-4"
            >
              Clear chart
            </button>
          </div>
          <p className="mt-1 text-xs text-ink/60">
            {comparedIds.length} shown. All selected members remain in the totals and table below.
          </p>
          <label className="sr-only" htmlFor="comparison-member-search">
            Find a comparison member
          </label>
          <input
            id="comparison-member-search"
            type="search"
            placeholder="Find by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-3 h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
          <fieldset className="mt-3 grid max-h-44 gap-x-4 overflow-y-auto sm:grid-cols-2">
            <legend className="sr-only">Visible comparison lines</legend>
            {visibleMembers.map((member) => {
              const selected = comparedIds.includes(member.userId);
              return (
                <label
                  key={member.userId}
                  className="flex min-h-11 items-center gap-2 text-xs has-disabled:opacity-50"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!selected && comparedIds.length >= maxComparisonMembers}
                    onChange={(event) =>
                      setComparedIds(
                        event.target.checked
                          ? [...comparedIds, member.userId]
                          : comparedIds.filter((id) => id !== member.userId),
                      )
                    }
                    className="size-4 shrink-0 accent-berry"
                  />
                  <span className="min-w-0 break-all">
                    <strong>{member.name ?? "Unnamed member"}</strong>
                    <span className="block text-ink/60">{member.email}</span>
                  </span>
                </label>
              );
            })}
            {!visibleMembers.length && (
              <p className="py-3 text-xs text-ink/60">No members match this search.</p>
            )}
          </fieldset>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Comparison legend">
            {comparedMembers.map((member, index) => (
              <span key={member.userId} className="flex min-w-0 items-center gap-2 text-xs">
                <span
                  className="h-0.5 w-5 shrink-0"
                  style={{ backgroundColor: comparisonColors[index] }}
                />
                <span className="break-all">
                  {member.name ?? member.email}
                  {member.name ? ` (${member.email})` : ""}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      {view === "comparison" && !comparedIds.length ? (
        <p className="flex h-72 items-center justify-center text-sm text-ink/60">
          Choose members to compare their daily spend.
        </p>
      ) : (
        <div
          className="h-72 w-full"
          aria-label={
            view === "combined"
              ? "Combined daily estimated AI cost chart"
              : "Individual member daily estimated AI cost chart"
          }
        >
          {view === "comparison" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tick={{ fill: "var(--color-ink)", fontSize: 11, opacity: 0.55 }}
                />
                <YAxis
                  domain={[0, (maximum: number) => maximum || 1_000_000]}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tickFormatter={(value) => formatUsd(Number(value))}
                  tick={{ fill: "var(--color-ink)", fontSize: 11, opacity: 0.55 }}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="max-w-64 rounded-xl border border-line bg-canvas px-3 py-2 text-xs shadow-[3px_3px_0_var(--color-peach)]">
                        <strong className="block">{label}</strong>
                        {payload.map((entry) => (
                          <span key={String(entry.name)} className="mt-1 block break-all">
                            {entry.name}: {formatUsd(Number(entry.value))}
                          </span>
                        ))}
                      </div>
                    ) : null
                  }
                />
                {comparedMembers.map((member, index) => (
                  <Line
                    key={member.userId}
                    dataKey={(point) => point.values[member.userId]}
                    name={member.name ? `${member.name} (${member.email})` : member.email}
                    stroke={comparisonColors[index]}
                    strokeDasharray={index > 2 ? "5 3" : undefined}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tick={{ fill: "var(--color-ink)", fontSize: 11, opacity: 0.55 }}
                />
                <YAxis
                  domain={[0, (maximum: number) => maximum || 1_000_000]}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tickFormatter={(value) => formatUsd(Number(value))}
                  tick={{ fill: "var(--color-ink)", fontSize: 11, opacity: 0.55 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-peach)", opacity: 0.35 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as ChartPoint;
                    return (
                      <div className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm shadow-[3px_3px_0_var(--color-peach)]">
                        <strong className="block">{point.label}</strong>
                        <span className="block text-ink/65">
                          {formatUsd(point.costMicrousd)} estimated
                        </span>
                        <span className="block text-ink/65">
                          {point.requestCount} {point.requestCount === 1 ? "request" : "requests"}
                        </span>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="costMicrousd"
                  fill="var(--color-berry)"
                  radius={[7, 7, 2, 2]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
