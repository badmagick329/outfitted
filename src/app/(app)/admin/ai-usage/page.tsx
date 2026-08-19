import Link from "next/link";
import { AdminSectionNavigation } from "@/components/admin-section-navigation";
import { AiUsageChart } from "@/components/ai-usage-chart";
import { AiUsageMemberSelect } from "@/components/ai-usage-member-select";
import { MemberPageHeader } from "@/components/member-page-header";
import {
  getAiUsageDashboard,
  getOutfitRecommendationDashboard,
  type AiUsageRange,
} from "@/features/ai-usage/server";
import { requireAdminUser } from "@/features/access/server";
import { listManagedUsers } from "@/features/access/server";
import { categoryGroupOptions } from "@/features/wardrobe/domain/category-groups";

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

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function roleLabel(role: string) {
  return categoryGroupOptions.find((option) => option.value === role)?.label ?? role;
}

export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; user?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const range = asRange(params.range);
  const managedUsers = await listManagedUsers();
  const selectedUser = managedUsers.find((user) => user.id === params.user) ?? null;
  const [dashboard, outfitDashboard] = await Promise.all([
    getAiUsageDashboard(range, selectedUser?.id),
    getOutfitRecommendationDashboard(range, selectedUser?.id),
  ]);
  const selectedLabel = selectedUser ? (selectedUser.name ?? selectedUser.email) : "all members";

  return (
    <>
      <MemberPageHeader
        title="AI usage"
        description={<p>Monitor estimated model costs and request activity.</p>}
        tone="mist"
      />
      <AdminSectionNavigation active="ai-usage" />

      <div className="mt-9 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.04em]">Last {range} days</h2>
            <p className="mt-1 text-sm text-ink/60">Showing {selectedLabel}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AiUsageMemberSelect
              range={range}
              selectedUserId={selectedUser?.id ?? null}
              members={managedUsers}
            />
            <nav
              className="flex rounded-full border border-line bg-canvas p-1"
              aria-label="Usage period"
            >
              {ranges.map((days) => (
                <Link
                  key={days}
                  href={`/admin/ai-usage?range=${days}${selectedUser ? `&user=${encodeURIComponent(selectedUser.id)}` : ""}`}
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
              <h2 className="text-2xl font-bold tracking-[-0.04em]">
                Daily estimated cost for {selectedLabel}
              </h2>
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
              <table className="w-full min-w-[54rem] text-left text-sm">
                <thead className="border-b border-line bg-canvas/55 font-mono text-[10px] uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-5 py-3 font-bold sm:px-7">Member</th>
                    <th className="px-4 py-3 font-bold">Cost</th>
                    <th className="px-4 py-3 font-bold">Requests</th>
                    <th className="px-4 py-3 font-bold">Analysis</th>
                    <th className="px-4 py-3 font-bold">Outfits</th>
                    <th className="px-4 py-3 font-bold">Reviews</th>
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
                      <td className="px-4 py-4">{user.wardrobeReviewCount}</td>
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
                New garment analyses, outfit suggestions and wardrobe reviews will appear here.
              </p>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-line bg-canvas shadow-[5px_5px_0_var(--color-mist)]">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <h2 className="text-2xl font-bold tracking-[-0.04em]">
              Outfit recommendation behaviour
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink/60">
              Repeated garments can be the right choice when there are few equally suitable
              alternatives. These figures show whether the available strong options are rotating
              over time.
            </p>
          </div>
          {outfitDashboard.totalSuggestionCount ? (
            <>
              <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-7">
                {[
                  {
                    label: "Instrumented suggestions",
                    value: outfitDashboard.instrumentedSuggestionCount.toLocaleString("en-GB"),
                    note: `of ${outfitDashboard.totalSuggestionCount} suggestions`,
                  },
                  {
                    label: "Average strong options",
                    value: outfitDashboard.averageQualityPoolSize?.toFixed(1) ?? "—",
                    note: "Candidates left after suitability checks",
                  },
                  {
                    label: "Consecutive garment reuse",
                    value: formatPercent(outfitDashboard.consecutiveGarmentReuse),
                    note: "Shared garments with the previous outfit",
                  },
                  {
                    label: "Longest garment streak",
                    value: outfitDashboard.longestGarmentStreak
                      ? `${outfitDashboard.longestGarmentStreak}`
                      : "—",
                    note: "Consecutive recommendations containing one garment",
                  },
                  {
                    label: "Candidate diversity",
                    value: formatPercent(outfitDashboard.candidateDiversity),
                    note: "Difference among equally suitable candidates",
                  },
                  {
                    label: "Shared-item candidate pools",
                    value: formatPercent(outfitDashboard.sharedItemCandidatePools),
                    note: "A diagnostic proxy, not a model-failure verdict",
                  },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-line bg-mist/55 p-4">
                    <strong className="block text-2xl tracking-[-0.04em]">{metric.value}</strong>
                    <span className="mt-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-ink/55">
                      {metric.label}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-ink/55">{metric.note}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-line">
                <div className="px-5 py-5 sm:px-7">
                  <h3 className="text-lg font-bold tracking-[-0.03em]">
                    Garment exposure by wardrobe section
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">
                    Shows whether one garment is appearing unusually often in each section.
                  </p>
                </div>
                {outfitDashboard.roleExposure.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[44rem] text-left text-sm">
                      <thead className="border-y border-line bg-mist/55 font-mono text-[10px] uppercase tracking-wide text-ink/50">
                        <tr>
                          <th className="px-5 py-3 font-bold sm:px-7">Section</th>
                          <th className="px-4 py-3 font-bold">Exposures</th>
                          <th className="px-4 py-3 font-bold">Most shown garment</th>
                          <th className="px-4 py-3 font-bold">Exposure share</th>
                          <th className="px-4 py-3 font-bold">Longest streak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {outfitDashboard.roleExposure.map((role) => (
                          <tr key={role.role}>
                            <td className="px-5 py-4 font-bold sm:px-7">{roleLabel(role.role)}</td>
                            <td className="px-4 py-4">{role.exposureCount}</td>
                            <td className="px-4 py-4">{role.mostFrequentGarment}</td>
                            <td className="px-4 py-4">{formatPercent(role.exposureShare)}</td>
                            <td className="px-4 py-4">{role.longestStreak}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 pb-6 text-sm text-ink/60 sm:px-7">
                    No instrumented garment exposures are available yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="px-5 py-10 text-center sm:px-7">
              <strong className="block text-lg">No outfit suggestions in this period</strong>
              <p className="mt-1 text-sm text-ink/60">
                Recommendation behaviour will appear after members request outfits.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
