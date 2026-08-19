import { describe, expect, it, vi } from "vitest";
import {
  candidateNovelty,
  recentSuggestionUsageByItemId,
  selectLeastRepetitiveCandidate,
  qualityGateCandidates,
  selectCandidateWithDiagnostics,
  validOutfitCandidates,
  itemIdsFromRecommendation,
  type ValidOutfitCandidate,
} from "./outfit-candidate-selection";

function candidate(id: string, referencedItemIds: string[]): ValidOutfitCandidate {
  return {
    recommendation: referencedItemIds.map((itemId) => `[${itemId}](item:${itemId})`).join(" with "),
    rationale: `${id} works`,
    referencedItemIds,
    suitabilityTier: "A",
    signature: [...referencedItemIds].sort().join(":"),
  };
}

describe("outfit candidate validation", () => {
  it("extracts item IDs from Markdown links", () => {
    expect(
      itemIdsFromRecommendation(
        "Wear [Teal shirt](item:item-1) with [Stone trousers](item:item-2).",
      ),
    ).toEqual(["item-1", "item-2"]);
  });

  it("accepts candidates only when their eligible linked and referenced IDs match", () => {
    const candidates = validOutfitCandidates(
      [
        candidate("valid", ["item-1"]),
        candidate("unavailable", ["item-1", "unknown"]),
        candidate("duplicate", ["item-1", "item-1"]),
        candidate("excluded", ["item-2"]),
        candidate("missing-start", ["item-3"]),
      ],
      new Set(["item-1", "item-2", "item-3"]),
      new Set(["item-2"]),
      "item-1",
    );

    expect(candidates).toEqual([
      expect.objectContaining({ referencedItemIds: ["item-1"], signature: "item-1" }),
    ]);
  });

  it("rejects candidates when linked and referenced garment sets differ", () => {
    const base = candidate("base", ["item-1"]);
    const candidates = validOutfitCandidates(
      [
        {
          ...base,
          recommendation: "Wear [Teal shirt](item:item-1) with [Stone trousers](item:item-2).",
        },
        { ...base, referencedItemIds: ["item-1", "item-2"] },
        {
          ...base,
          recommendation: "Wear [Teal shirt](item:item-1) and repeat [Teal shirt](item:item-1).",
        },
      ],
      new Set(["item-1", "item-2"]),
      new Set(),
    );

    expect(candidates).toEqual([
      expect.objectContaining({ referencedItemIds: ["item-1"], signature: "item-1" }),
    ]);
  });
});

describe("candidate novelty selection", () => {
  it("prefers a candidate that avoids the immediately previous suggestion", () => {
    const selected = selectLeastRepetitiveCandidate(
      [candidate("repeated", ["top-1", "bottom-1"]), candidate("fresh", ["top-2", "bottom-2"])],
      [["top-1", "bottom-1"]],
    );

    expect(selected.signature).toBe("bottom-2:top-2");
  });

  it("continues to penalise a garment used two suggestions ago", () => {
    const selected = selectLeastRepetitiveCandidate(
      [candidate("dominant", ["top-1"]), candidate("fresh", ["top-2"])],
      [["other-item"], ["top-1"]],
    );

    expect(selected.signature).toBe("top-2");
  });

  it("uses the highest individual recent-use count before the overall average", () => {
    const selected = selectLeastRepetitiveCandidate(
      [candidate("overused", ["top-1", "fresh"]), candidate("less-used", ["top-2", "fresh"])],
      [[], [], [], ["top-1"], ["top-1"], ["top-1"], ["top-2"]],
    );

    expect(selected.signature).toBe("fresh:top-2");
  });

  it("uses ratios and averages so candidate size does not affect an equally fresh score", () => {
    const usage = recentSuggestionUsageByItemId([]);

    expect(candidateNovelty(candidate("one", ["item-1"]), [], usage)).toEqual({
      immediateOverlapRatio: 0,
      lastThreeUsageAverage: 0,
      highestRecentUseCount: 0,
      overallRecentUseAverage: 0,
    });
    expect(candidateNovelty(candidate("two", ["item-2", "item-3"]), [], usage)).toEqual({
      immediateOverlapRatio: 0,
      lastThreeUsageAverage: 0,
      highestRecentUseCount: 0,
      overallRecentUseAverage: 0,
    });
  });

  it("excludes a mandatory selected garment from diversity scoring", () => {
    const selected = selectLeastRepetitiveCandidate(
      [
        candidate("recent-other", ["required", "item-1"]),
        candidate("fresh-other", ["required", "item-2"]),
      ],
      [["required", "item-1"]],
      "required",
    );

    expect(selected.signature).toBe("item-2:required");
  });

  it("still selects a valid candidate when every candidate shares the required garment", () => {
    const selected = selectLeastRepetitiveCandidate(
      [candidate("first", ["required"]), candidate("second", ["required"])],
      [["required"]],
      "required",
      () => 0,
    );

    expect(selected.referencedItemIds).toEqual(["required"]);
  });

  it("uses randomness only among equally best candidates", () => {
    const random = vi.fn(() => 0.99);
    const selected = selectLeastRepetitiveCandidate(
      [candidate("first", ["item-1"]), candidate("second", ["item-2"])],
      [],
      undefined,
      random,
    );

    expect(random).toHaveBeenCalledOnce();
    expect(selected.signature).toBe("item-2");
  });

  it("never includes worse candidates in the random tie-break pool", () => {
    const random = vi.fn(() => 0.99);
    const selected = selectLeastRepetitiveCandidate(
      [candidate("fresh", ["item-1"]), candidate("repeated", ["item-2"])],
      [["item-2"]],
      undefined,
      random,
    );

    expect(random).not.toHaveBeenCalled();
    expect(selected.signature).toBe("item-1");
  });
});

describe("quality-gated role-aware selection", () => {
  it("never lets a fresher lower tier beat an A-tier candidate", () => {
    const high = { ...candidate("high", ["top-1"]), suitabilityTier: "A" as const };
    const fallback = { ...candidate("fallback", ["top-2"]), suitabilityTier: "B" as const };
    expect(qualityGateCandidates([high, fallback]).candidates).toEqual([high]);
  });

  it("does not score an unchanged role", () => {
    const selected = selectCandidateWithDiagnostics(
      [
        candidate("repeat-top", ["top-fixed", "bottom-1"]),
        candidate("fresh-bottom", ["top-fixed", "bottom-2"]),
      ],
      [["top-fixed", "bottom-1"]],
      {
        itemRoleById: new Map([
          ["top-fixed", "tops"],
          ["bottom-1", "bottoms"],
          ["bottom-2", "bottoms"],
        ]),
      },
    );
    expect(selected.candidate.referencedItemIds).toEqual(["top-fixed", "bottom-2"]);
    expect(selected.variableRoles).toEqual(["bottoms"]);
  });

  it("uses a supplied displayed outfit only for immediate comparison", () => {
    const selected = selectCandidateWithDiagnostics(
      [candidate("shown", ["top-1"]), candidate("different", ["top-2"])],
      [],
      {
        previousItemIds: ["top-1"],
        itemRoleById: new Map([
          ["top-1", "tops"],
          ["top-2", "tops"],
        ]),
      },
    );
    expect(selected.candidate.referencedItemIds).toEqual(["top-2"]);
  });
});
