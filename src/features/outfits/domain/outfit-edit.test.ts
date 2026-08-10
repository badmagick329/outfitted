import { describe, expect, it } from "vitest";
import { replaceOutfitRecommendationItem } from "./outfit-edit";

describe("replaceOutfitRecommendationItem", () => {
  it("updates every linked mention of the swapped garment", () => {
    expect(
      replaceOutfitRecommendationItem(
        "Layer [Old shirt](item:old-id) over the tee, then leave the [Old shirt](item:old-id) open.",
        "old-id",
        "new-id",
        "New shirt",
      ),
    ).toBe(
      "Layer [New shirt](item:new-id) over the tee, then leave the [New shirt](item:new-id) open.",
    );
  });

  it("leaves other garment links unchanged", () => {
    expect(
      replaceOutfitRecommendationItem(
        "Wear [Tee](item:tee-id) with [Old trousers](item:old-id).",
        "old-id",
        "new-id",
        "New trousers",
      ),
    ).toBe("Wear [Tee](item:tee-id) with [New trousers](item:new-id).");
  });
});
