import { describe, expect, it, vi } from "vitest";
import {
  candidateNovelty,
  recentSuggestionUsageByItemId,
  selectLeastRepetitiveCandidate,
  validOutfitCandidates,
  type ValidOutfitCandidate,
} from "./outfit-candidate-selection";

function candidate(id: string, referencedItemIds: string[]): ValidOutfitCandidate {
  return {
    recommendation: `Wear ${id}`,
    rationale: `${id} works`,
    referencedItemIds,
    signature: [...referencedItemIds].sort().join(":"),
  };
}

describe("outfit candidate validation", () => {
  it("sanitises IDs, removes duplicates, and rejects empty, excluded, duplicate, or incomplete candidates", () => {
    const candidates = validOutfitCandidates(
      [
        candidate("valid", ["item-1", "item-1", "unknown"]),
        candidate("duplicate", ["item-1"]),
        candidate("empty", ["unknown"]),
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

    expect(candidateNovelty(candidate("one", ["item-1"]), [], usage)).toEqual([0, 0, 0, 0]);
    expect(candidateNovelty(candidate("two", ["item-2", "item-3"]), [], usage)).toEqual([
      0, 0, 0, 0,
    ]);
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
