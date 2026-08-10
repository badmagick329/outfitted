import { describe, expect, it } from "vitest";
import {
  analysisStatusSnapshot,
  reconcileTrackedAnalyses,
  type AnalysisStatusItem,
} from "./analysis-status";

const processingItem: AnalysisStatusItem = {
  id: "item-1",
  status: "processing",
  updatedAt: "2026-08-10T18:00:00.000Z",
};

describe("analysis status tracking", () => {
  it("recognises a tracked garment that has left the in-progress response", () => {
    const result = reconcileTrackedAnalyses(["item-1"], []);

    expect(result.completedItemIds).toEqual(["item-1"]);
    expect([...result.trackedItemIds]).toEqual([]);
  });

  it("adopts active garments discovered by the shared poll", () => {
    const result = reconcileTrackedAnalyses([], [processingItem]);

    expect(result.completedItemIds).toEqual([]);
    expect([...result.trackedItemIds]).toEqual(["item-1"]);
  });

  it("changes its snapshot when an analysis advances", () => {
    expect(analysisStatusSnapshot([processingItem])).not.toBe(
      analysisStatusSnapshot([{ ...processingItem, status: "pending" }]),
    );
  });
});
