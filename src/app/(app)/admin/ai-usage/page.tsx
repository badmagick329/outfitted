import Link from "next/link";
import { AdminSectionNavigation } from "@/components/admin-section-navigation";
import { AiUsageChart } from "@/components/ai-usage-chart";
import { MemberPageHeader } from "@/components/member-page-header";
import { getAiUsageDashboard, type AiUsageRange } from "@/features/ai-usage/server";
import { requireAdminUser } from "@/features/access/server";

const ranges: AiUsageRange[] = [7, 30, 90];

function asRange(value: string | undefined): AiUsageRange {
  const parsed = Number(value);
  return ranges.includes(parsed as AiUsageRange) ? (parsed as AiUsageRange) : 30;
}

function formatUsd(microusd: number) {
  const dollars = microusd / 1_000_000;
  if (dollars === 0) return "$0.00";
  if (dollars < 0.01) return `$${dollars.toFixed(6)}`;
  if (dollars < 1) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

function formatLatency(milliseconds: number) {
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminUser();
  const range = asRange((await searchParams).range);
  const dashboard = await getAiUsageDashboard(range);

  return (
    <>
      <MemberPageHeader
        title="AI usage"
        description={<p>Monitor estimated model costs and request activity.</p>}
        tone="mist"
      />
      <AdminSectionNavigation active="ai-usage" />

      <div className="mt-9 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-[-0.04em]">Last {range} days</h2>
          <nav
            className="flex rounded-full border border-line bg-canvas p-1"
            aria-label="Usage period"
          >
            {ranges.map((days) => (
              <Link
                key={days}
                href={`/admin/ai-usage?range=${days}`}
                aria-current={range === days ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry ${
                  range === days ? "bg-berry text-canvas" : "text-ink/55 hover:text-ink"
                }`}
              >
                {days} days
              </Link>
            ))}
          </nav>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="AI usage summary">
          {[
            {
              label: "Estimated cost",
              value: formatUsd(dashboard.summary.totalCostMicrousd),
              tone: "bg-citrus/30",
            },
            {
              label: "Requests",
              value: dashboard.summary.requestCount.toLocaleString("en-GB"),
              tone: "bg-mist",
            },
            {
              label: "Average request",
              value: formatUsd(dashboard.summary.averageCostMicrousd),
              tone: "bg-peach/50",
            },
            {
              label: "Success rate",
              value: `${dashboard.summary.successRate}%`,
              tone: "bg-canvas",
            },
          ].map((summary) => (
            <div
              key={summary.label}
              className={`rounded-2xl border border-line p-4 ${summary.tone}`}
            >
              <strong className="block text-3xl tracking-[-0.05em]">{summary.value}</strong>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink/55">
                {summary.label}
              </span>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-line bg-canvas p-5 shadow-[5px_5px_0_var(--color-peach)] sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.04em]">Daily estimated cost</h2>
              <p className="mt-1 text-sm text-ink/60">Based on usage returned by the model.</p>
            </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink/45">
              Average response {formatLatency(dashboard.summary.averageLatencyMs)}
            </span>
          </div>
          <AiUsageChart data={dashboard.daily} />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-ink/55">
            <span>{dashboard.summary.totalInputTokens.toLocaleString("en-GB")} input tokens</span>
            <span>{dashboard.summary.totalOutputTokens.toLocaleString("en-GB")} output tokens</span>
            <span>Figures are estimates, not provider invoices</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-line bg-mist/55">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <h2 className="text-2xl font-bold tracking-[-0.04em]">Usage by member</h2>
            <p className="mt-1 text-sm text-ink/60">
              Costs and activity within the selected period.
            </p>
          </div>
          {dashboard.users.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-line bg-canvas/55 font-mono text-[10px] uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-5 py-3 font-bold sm:px-7">Member</th>
                    <th className="px-4 py-3 font-bold">Cost</th>
                    <th className="px-4 py-3 font-bold">Requests</th>
                    <th className="px-4 py-3 font-bold">Analysis</th>
                    <th className="px-4 py-3 font-bold">Outfits</th>
                    <th className="px-4 py-3 font-bold">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dashboard.users.map((user) => (
                    <tr key={user.userId} className="bg-canvas/20">
                      <td className="px-5 py-4 sm:px-7">
                        <strong className="block">{user.name ?? "Unnamed member"}</strong>
                        <span className="block text-xs text-ink/55">{user.email}</span>
                      </td>
                      <td className="px-4 py-4 font-bold">{formatUsd(user.costMicrousd)}</td>
                      <td className="px-4 py-4">{user.requestCount}</td>
                      <td className="px-4 py-4">{user.garmentAnalysisCount}</td>
                      <td className="px-4 py-4">{user.outfitSuggestionCount}</td>
                      <td className="px-4 py-4">
                        <span
                          className={user.failedCount ? "font-bold text-red-700" : "text-ink/45"}
                        >
                          {user.failedCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-7">
              <strong className="block text-lg">No AI requests in this period</strong>
              <p className="mt-1 text-sm text-ink/60">
                New garment analyses and outfit suggestions will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
