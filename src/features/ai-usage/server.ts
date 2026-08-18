import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageEvents, users } from "@/lib/db/schema";
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
