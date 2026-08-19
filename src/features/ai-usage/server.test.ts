import { describe, expect, it } from "vitest";
import { aggregateOutfitRecommendationDiagnostics } from "./server";

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
