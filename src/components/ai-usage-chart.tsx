"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartPoint = {
  date: string;
  label: string;
  costMicrousd: number;
  requestCount: number;
};

function formatUsd(microusd: number) {
  const dollars = microusd / 1_000_000;
  if (dollars === 0) return "$0";
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

export function AiUsageChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-72 w-full" aria-label="Daily estimated AI cost chart">
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
          <Bar dataKey="costMicrousd" fill="var(--color-berry)" radius={[7, 7, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
