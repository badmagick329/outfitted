import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  aggregateAiUsageDashboard,
  aggregateOutfitRecommendationDiagnostics,
  getAiUsageDashboard,
  getOutfitRecommendationDashboard,
} from "./server";

const database = vi.hoisted(() => ({ results: [] as unknown[][], predicates: [] as SQL[] }));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => {
      let rows = database.results.shift() ?? [];
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: (predicate: SQL) => {
          database.predicates.push(predicate);
          const sql = new PgDialect().sqlToQuery(predicate);
          if (sql.sql.includes('"user_id" in')) {
            rows = rows.filter((row) =>
              sql.params.slice(1).includes((row as { userId: string }).userId),
            );
          } else if (sql.sql.includes("false")) rows = [];
          return query;
        },
        orderBy: async () => rows,
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
      };
      return query;
    },
  },
}));

const diagnostics = {
  version: 1 as const,
  requestMode: "initial" as const,
  attemptCount: 1,
  generatedCandidateCount: 2,
  validCandidateCount: 2,
  selectedSuitabilityTier: "A" as const,
  qualityPoolSize: 2,
  eligibleItemCountByRole: { tops: 3, bottoms: 2 },
  qualityPool: [
    { itemIds: ["top-1", "bottom-1"], itemsByRole: { tops: ["top-1"], bottoms: ["bottom-1"] } },
    { itemIds: ["top-2", "bottom-1"], itemsByRole: { tops: ["top-2"], bottoms: ["bottom-1"] } },
  ],
  variableRoles: ["tops"],
  selectedNovelty: {
    immediateOverlapRatio: 0,
    lastThreeUsageAverage: 0,
    highestRecentUseCount: 0,
    overallRecentUseAverage: 0,
  },
};

describe("aggregateOutfitRecommendationDiagnostics", () => {
  it("partitions sequential reuse and streaks by user", () => {
    const summary = aggregateOutfitRecommendationDiagnostics([
      {
        userId: "one",
        createdAt: new Date("2026-01-01"),
        selectedItemIds: ["top-1", "bottom-1"],
        diagnostics,
      },
      {
        userId: "two",
        createdAt: new Date("2026-01-02"),
        selectedItemIds: ["top-1"],
        diagnostics: null,
      },
      {
        userId: "one",
        createdAt: new Date("2026-01-03"),
        selectedItemIds: ["top-1", "bottom-2"],
        diagnostics,
      },
    ]);
    expect(summary.consecutiveGarmentReuse).toBe(0.5);
    expect(summary.longestGarmentStreak).toBe(2);
    expect(summary.instrumentedSuggestionCount).toBe(2);
    expect(summary.candidateDiversity).toBeCloseTo(2 / 3);
  });

  it("ignores null diagnostics for candidate metrics", () => {
    const summary = aggregateOutfitRecommendationDiagnostics([
      {
        userId: "one",
        createdAt: new Date("2026-01-01"),
        selectedItemIds: ["top-1"],
        diagnostics: null,
      },
    ]);
    expect(summary.averageQualityPoolSize).toBeNull();
    expect(summary.candidateDiversity).toBeNull();
  });
});

const members = ["one", "two", "three", "unused"].map((id) => ({
  id,
  name: id,
  email: `${id}@example.com`,
}));
const start = new Date("2026-10-01T00:00:00Z");
const usageRows = [
  {
    userId: "one",
    operation: "garment_analysis",
    status: "success",
    estimatedCostMicrousd: 100,
    latencyMs: 100,
    inputTokens: 10,
    outputTokens: 1,
  },
  {
    userId: "two",
    operation: "outfit_suggestion",
    status: "success",
    estimatedCostMicrousd: 300,
    latencyMs: 200,
    inputTokens: 20,
    outputTokens: 2,
  },
  {
    userId: "two",
    operation: "wardrobe_review",
    status: "failed",
    estimatedCostMicrousd: 800,
    latencyMs: 600,
    inputTokens: 50,
    outputTokens: 5,
  },
  {
    userId: "three",
    operation: "wardrobe_review",
    status: "success",
    estimatedCostMicrousd: 9000,
    latencyMs: 9000,
    inputTokens: 9000,
    outputTokens: 9000,
  },
].map((row) => ({
  ...row,
  userName: row.userId,
  userEmail: `${row.userId}@example.com`,
  createdAt: start,
}));

describe("selected-group usage reporting", () => {
  it("excludes a third member from every cost section and weights rates by requests", () => {
    const report = aggregateAiUsageDashboard(7, start, usageRows, ["one", "two"], members);
    expect(report.summary).toEqual({
      totalCostMicrousd: 1200,
      requestCount: 3,
      averageCostMicrousd: 400,
      successRate: 67,
      averageLatencyMs: 300,
      totalInputTokens: 80,
      totalOutputTokens: 8,
    });
    expect(report.daily[0]).toMatchObject({ costMicrousd: 1200, requestCount: 3 });
    expect(report.users.map((member) => member.userId)).toEqual(["two", "one"]);
    expect(report.users[0]).toMatchObject({
      outfitSuggestionCount: 1,
      wardrobeReviewCount: 1,
      failedCount: 1,
    });
    expect(report.memberDaily.map((member) => member.userId)).toEqual(["one", "two"]);
    expect(report.memberDaily[1].data[0].costMicrousd).toBe(1100);
  });

  it("covers everyone, one member, and explicit members without requests", () => {
    expect(aggregateAiUsageDashboard(7, start, usageRows, null, members).summary.requestCount).toBe(
      4,
    );
    expect(
      aggregateAiUsageDashboard(7, start, usageRows, ["one"], members).summary.requestCount,
    ).toBe(1);
    const empty = aggregateAiUsageDashboard(7, start, usageRows, ["unused"], members);
    expect(empty.summary).toMatchObject({ requestCount: 0, successRate: null });
    expect(empty.users).toHaveLength(1);
    expect(empty.users[0]).toMatchObject({ userId: "unused", costMicrousd: 0 });
    expect(empty.memberDaily[0].data).toHaveLength(7);
    expect(empty.memberDaily[0].data.every((day) => day.costMicrousd === 0)).toBe(true);
    expect(aggregateAiUsageDashboard(7, start, usageRows, [], members).users).toEqual([]);
  });

  it("constrains usage and recommendation database reads to exactly the same selected group", async () => {
    database.predicates = [];
    database.results = [
      usageRows,
      [
        {
          userId: "one",
          createdAt: new Date("2026-10-01"),
          selectedItemIds: ["top-1", "bottom-1"],
          diagnostics,
        },
        {
          userId: "two",
          createdAt: new Date("2026-10-02"),
          selectedItemIds: ["top-1"],
          diagnostics: { ...diagnostics, qualityPoolSize: 8 },
        },
        {
          userId: "one",
          createdAt: new Date("2026-10-03"),
          selectedItemIds: ["top-1", "bottom-2"],
          diagnostics,
        },
        {
          userId: "three",
          createdAt: new Date("2026-10-04"),
          selectedItemIds: ["excluded-top"],
          diagnostics: { ...diagnostics, qualityPoolSize: 100 },
        },
      ],
      [
        { id: "top-1", name: "Shirt", categoryGroup: "tops" },
        { id: "bottom-1", name: "Jeans", categoryGroup: "bottoms" },
        { id: "bottom-2", name: "Trousers", categoryGroup: "bottoms" },
      ],
    ];
    const report = await getAiUsageDashboard(7, ["one", "two"], members);
    const outfits = await getOutfitRecommendationDashboard(7, ["one", "two"]);
    expect(report.summary.requestCount).toBe(3);
    expect(outfits).toMatchObject({
      totalSuggestionCount: 3,
      instrumentedSuggestionCount: 3,
      averageQualityPoolSize: 4,
      consecutiveGarmentReuse: 0.5,
      longestGarmentStreak: 2,
    });
    expect(outfits.roleExposure.find((role) => role.role === "tops")).toMatchObject({
      exposureCount: 3,
      mostFrequentGarment: "Shirt",
      longestStreak: 2,
    });
    expect(outfits.candidateDiversity).toBeCloseTo(2 / 3);
    expect(outfits.sharedItemCandidatePools).toBe(1);
    const dialect = new PgDialect();
    for (const predicate of database.predicates.slice(0, 2)) {
      const query = dialect.sqlToQuery(predicate);
      expect(query.sql).toContain('"user_id" in ($2, $3)');
      expect(query.params.slice(1)).toEqual(["one", "two"]);
      expect(query.params).not.toContain("three");
    }
  });

  it("issues a false database predicate for an explicit empty group", async () => {
    database.predicates = [];
    database.results = [[], []];
    await getAiUsageDashboard(7, [], members);
    await getOutfitRecommendationDashboard(7, []);
    for (const predicate of database.predicates)
      expect(new PgDialect().sqlToQuery(predicate).sql).toContain("false");
  });
});
