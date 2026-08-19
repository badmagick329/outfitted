import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageEvents, outfitSuggestions, users, wardrobeItems } from "@/lib/db/schema";
import type { OutfitSelectionDiagnosticsV1 } from "@/features/outfits/application/outfit-candidate-selection";
import type { AiUsageRecorder, RecordAiUsageInput } from "./domain/contracts";
import { AI_PRICING_VERSION, estimateCostMicrousd } from "./domain/pricing";

export const aiUsageRecorder: AiUsageRecorder = {
  async record(input: RecordAiUsageInput) {
    const usage = input.usage ?? {
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 0,
    };
    await db.insert(aiUsageEvents).values({
      userId: input.userId,
      operation: input.operation,
      model: input.model,
      status: input.status,
      providerRequestId: input.providerRequestId,
      ...usage,
      estimatedCostMicrousd: estimateCostMicrousd(usage),
      latencyMs: input.latencyMs,
      pricingVersion: AI_PRICING_VERSION,
    });
  },
};

export type AiUsageRange = 7 | 30 | 90;

export async function getAiUsageDashboard(days: AiUsageRange, userId?: string) {
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1),
  );
  const rows = await db
    .select({
      userId: aiUsageEvents.userId,
      userName: users.name,
      userEmail: users.email,
      operation: aiUsageEvents.operation,
      status: aiUsageEvents.status,
      inputTokens: aiUsageEvents.inputTokens,
      outputTokens: aiUsageEvents.outputTokens,
      estimatedCostMicrousd: aiUsageEvents.estimatedCostMicrousd,
      latencyMs: aiUsageEvents.latencyMs,
      createdAt: aiUsageEvents.createdAt,
    })
    .from(aiUsageEvents)
    .innerJoin(users, eq(aiUsageEvents.userId, users.id))
    .where(
      and(
        gte(aiUsageEvents.createdAt, start),
        userId ? eq(aiUsageEvents.userId, userId) : undefined,
      ),
    )
    .orderBy(asc(aiUsageEvents.createdAt));

  const daily = new Map<
    string,
    { date: string; label: string; costMicrousd: number; requestCount: number }
  >();
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    daily.set(key, {
      date: key,
      label: dateFormatter.format(date),
      costMicrousd: 0,
      requestCount: 0,
    });
  }

  const perUser = new Map<
    string,
    {
      userId: string;
      name: string | null;
      email: string;
      costMicrousd: number;
      requestCount: number;
      garmentAnalysisCount: number;
      outfitSuggestionCount: number;
      wardrobeReviewCount: number;
      failedCount: number;
    }
  >();

  let totalCostMicrousd = 0;
  let successfulCount = 0;
  let totalLatencyMs = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const row of rows) {
    totalCostMicrousd += row.estimatedCostMicrousd;
    totalLatencyMs += row.latencyMs;
    totalInputTokens += row.inputTokens;
    totalOutputTokens += row.outputTokens;
    if (row.status === "success") successfulCount += 1;

    const dateKey = row.createdAt.toISOString().slice(0, 10);
    const day = daily.get(dateKey);
    if (day) {
      day.costMicrousd += row.estimatedCostMicrousd;
      day.requestCount += 1;
    }

    const user = perUser.get(row.userId) ?? {
      userId: row.userId,
      name: row.userName,
      email: row.userEmail,
      costMicrousd: 0,
      requestCount: 0,
      garmentAnalysisCount: 0,
      outfitSuggestionCount: 0,
      wardrobeReviewCount: 0,
      failedCount: 0,
    };
    user.costMicrousd += row.estimatedCostMicrousd;
    user.requestCount += 1;
    if (row.operation === "garment_analysis") user.garmentAnalysisCount += 1;
    if (row.operation === "outfit_suggestion") user.outfitSuggestionCount += 1;
    if (row.operation === "wardrobe_review") user.wardrobeReviewCount += 1;
    if (row.status === "failed") user.failedCount += 1;
    perUser.set(row.userId, user);
  }

  return {
    days,
    summary: {
      totalCostMicrousd,
      requestCount: rows.length,
      averageCostMicrousd: rows.length ? Math.round(totalCostMicrousd / rows.length) : 0,
      successRate: rows.length ? Math.round((successfulCount / rows.length) * 100) : 100,
      averageLatencyMs: rows.length ? Math.round(totalLatencyMs / rows.length) : 0,
      totalInputTokens,
      totalOutputTokens,
    },
    daily: [...daily.values()],
    users: [...perUser.values()].sort(
      (left, right) =>
        right.costMicrousd - left.costMicrousd || right.requestCount - left.requestCount,
    ),
  };
}

type DiagnosticSuggestion = {
  userId: string;
  createdAt: Date;
  selectedItemIds: string[];
  diagnostics: OutfitSelectionDiagnosticsV1 | null;
};

function isDiagnosticsV1(value: unknown): value is OutfitSelectionDiagnosticsV1 {
  if (!value || typeof value !== "object") return false;
  const diagnostics = value as Partial<OutfitSelectionDiagnosticsV1>;
  return (
    diagnostics.version === 1 &&
    (diagnostics.requestMode === "initial" || diagnostics.requestMode === "another") &&
    Array.isArray(diagnostics.qualityPool) &&
    Array.isArray(diagnostics.variableRoles) &&
    typeof diagnostics.eligibleItemCountByRole === "object"
  );
}

function jaccardDiversity(left: string[], right: string[]) {
  const leftIds = new Set(left);
  const rightIds = new Set(right);
  const union = new Set([...leftIds, ...rightIds]);
  if (!union.size) return 0;
  const intersection = [...leftIds].filter((itemId) => rightIds.has(itemId)).length;
  return 1 - intersection / union.size;
}

export function aggregateOutfitRecommendationDiagnostics(
  rows: DiagnosticSuggestion[],
  itemRoleById: ReadonlyMap<string, string> = new Map(),
) {
  const byUser = new Map<string, DiagnosticSuggestion[]>();
  for (const row of rows)
    (byUser.get(row.userId) ?? byUser.set(row.userId, []).get(row.userId)!).push(row);
  let overlapItems = 0;
  let comparedItems = 0;
  let longestGarmentStreak = 0;
  const exposureByRole = new Map<string, Map<string, { count: number; longestStreak: number }>>();
  for (const userRows of byUser.values()) {
    userRows.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    let previous = new Set<string>();
    const streaks = new Map<string, number>();
    for (const row of userRows) {
      const current = new Set(row.selectedItemIds);
      if (previous.size) {
        overlapItems += [...current].filter((itemId) => previous.has(itemId)).length;
        comparedItems += current.size;
      }
      for (const itemId of current) {
        const streak = (previous.has(itemId) ? (streaks.get(itemId) ?? 0) : 0) + 1;
        streaks.set(itemId, streak);
        longestGarmentStreak = Math.max(longestGarmentStreak, streak);
      }
      const diagnostics = row.diagnostics;
      if (diagnostics) {
        const roleByItemId = new Map<string, string>();
        for (const candidate of diagnostics.qualityPool) {
          for (const [role, itemIds] of Object.entries(candidate.itemsByRole))
            for (const itemId of itemIds) roleByItemId.set(itemId, role);
        }
        for (const itemId of current) {
          const role = roleByItemId.get(itemId) ?? itemRoleById.get(itemId) ?? "other";
          const roleExposures = exposureByRole.get(role) ?? new Map();
          const itemExposure = roleExposures.get(itemId) ?? { count: 0, longestStreak: 0 };
          itemExposure.count += 1;
          itemExposure.longestStreak = Math.max(
            itemExposure.longestStreak,
            streaks.get(itemId) ?? 1,
          );
          roleExposures.set(itemId, itemExposure);
          exposureByRole.set(role, roleExposures);
        }
      }
      previous = current;
    }
  }

  const instrumented = rows.filter((row) => row.diagnostics);
  let pairwiseDiversityTotal = 0;
  let pairwiseDiversityCount = 0;
  let sharedItemPoolCount = 0;
  let multiCandidatePoolCount = 0;
  for (const { diagnostics } of instrumented) {
    if (!diagnostics) continue;
    for (let index = 0; index < diagnostics.qualityPool.length; index += 1) {
      for (let other = index + 1; other < diagnostics.qualityPool.length; other += 1) {
        pairwiseDiversityTotal += jaccardDiversity(
          diagnostics.qualityPool[index]!.itemIds,
          diagnostics.qualityPool[other]!.itemIds,
        );
        pairwiseDiversityCount += 1;
      }
    }
    if (diagnostics.qualityPool.length < 2) continue;
    multiCandidatePoolCount += 1;
    const allRoles = new Set(
      diagnostics.qualityPool.flatMap((candidate) => Object.keys(candidate.itemsByRole)),
    );
    const hasSharedRoleItem = [...allRoles].some((role) => {
      const [firstCandidate, ...remainingCandidates] = diagnostics.qualityPool;
      const shared = remainingCandidates.reduce<string[]>(
        (sharedIds, candidate) =>
          sharedIds.filter((itemId) => (candidate.itemsByRole[role] ?? []).includes(itemId)),
        firstCandidate?.itemsByRole[role] ?? [],
      );
      const nonStartingShared = shared.filter(
        (itemId) => itemId !== diagnostics.selectedStartingItemId,
      );
      return (
        nonStartingShared.length > 0 &&
        (diagnostics.eligibleItemCountByRole[role] ?? 0) > nonStartingShared.length
      );
    });
    if (hasSharedRoleItem) sharedItemPoolCount += 1;
  }
  return {
    totalSuggestionCount: rows.length,
    instrumentedSuggestionCount: instrumented.length,
    averageQualityPoolSize: instrumented.length
      ? instrumented.reduce((sum, row) => sum + row.diagnostics!.qualityPoolSize, 0) /
        instrumented.length
      : null,
    consecutiveGarmentReuse: comparedItems ? overlapItems / comparedItems : null,
    longestGarmentStreak,
    candidateDiversity: pairwiseDiversityCount
      ? pairwiseDiversityTotal / pairwiseDiversityCount
      : null,
    sharedItemCandidatePools: multiCandidatePoolCount
      ? sharedItemPoolCount / multiCandidatePoolCount
      : null,
    exposureByRole,
  };
}

export async function getOutfitRecommendationDashboard(days: AiUsageRange, userId?: string) {
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1),
  );
  const suggestions = await db
    .select({
      userId: outfitSuggestions.userId,
      createdAt: outfitSuggestions.createdAt,
      selectedItemIds: outfitSuggestions.selectedItemIds,
      diagnostics: outfitSuggestions.diagnostics,
    })
    .from(outfitSuggestions)
    .where(
      and(
        gte(outfitSuggestions.createdAt, start),
        userId ? eq(outfitSuggestions.userId, userId) : undefined,
      ),
    )
    .orderBy(asc(outfitSuggestions.createdAt));
  const rows = suggestions.map((suggestion) => ({
    ...suggestion,
    diagnostics: isDiagnosticsV1(suggestion.diagnostics) ? suggestion.diagnostics : null,
  }));
  const itemIds = [...new Set(rows.flatMap((row) => row.selectedItemIds))];
  const itemRows = itemIds.length
    ? await db
        .select({
          id: wardrobeItems.id,
          name: wardrobeItems.name,
          categoryGroup: wardrobeItems.categoryGroup,
        })
        .from(wardrobeItems)
        .where(inArray(wardrobeItems.id, itemIds))
    : [];
  const itemById = new Map(itemRows.map((item) => [item.id, item]));
  const dashboard = aggregateOutfitRecommendationDiagnostics(
    rows,
    new Map(itemRows.map((item) => [item.id, item.categoryGroup ?? "other"])),
  );
  const roleExposure = [...dashboard.exposureByRole.entries()]
    .map(([role, exposures]) => {
      const totalExposures = [...exposures.values()].reduce(
        (total, exposure) => total + exposure.count,
        0,
      );
      const [itemId, dominant] = [...exposures.entries()].sort(
        (left, right) => right[1].count - left[1].count,
      )[0]!;
      return {
        role,
        exposureCount: totalExposures,
        mostFrequentGarment: itemById.get(itemId)?.name ?? "Unavailable garment",
        exposureShare: dominant.count / totalExposures,
        longestStreak: dominant.longestStreak,
      };
    })
    .sort((left, right) => right.exposureCount - left.exposureCount);
  return { ...dashboard, roleExposure };
}
