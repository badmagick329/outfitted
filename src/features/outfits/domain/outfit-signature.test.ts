import { describe, expect, it } from "vitest";
import { canonicalOutfitItemIds, matchesOutfit, outfitSignature } from "./outfit-signature";

describe("outfit signatures", () => {
  it("treats the same garments in any order as one outfit", () => {
    expect(outfitSignature(["item-b", "item-a"])).toBe(outfitSignature(["item-a", "item-b"]));
    expect(matchesOutfit(["item-b", "item-a"], ["item-a", "item-b"])).toBe(true);
  });

  it("removes duplicate garment IDs before building a signature", () => {
    expect(canonicalOutfitItemIds(["item-b", "item-a", "item-b"])).toEqual(["item-a", "item-b"]);
  });
});
