import { describe, expect, it } from "vitest";
import { removeOutfitItem, replaceOutfitRecommendationItem } from "./outfit-edit";

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

  it("removes an outfit garment without changing the remaining order or final garment", () => {
    expect(removeOutfitItem(["first", "middle", "last"], "middle")).toEqual(["first", "last"]);
    expect(removeOutfitItem(["only"], "only")).toEqual(["only"]);
  });
});
