import { describe, expect, it } from "vitest";
import { inferCategoryGroup, parseWardrobeFilter, resolveCategoryGroup } from "./category-groups";

describe("wardrobe category groups", () => {
  it.each([
    ["Long-sleeve shirt", "tops"],
    ["Mock-neck pullover", "tops"],
    ["Cargo trousers", "bottoms"],
    ["Chore jacket", "outerwear"],
    ["Midi dress", "dresses-jumpsuits"],
    ["Unusual co-ord", "other"],
  ] as const)("maps %s to %s", (category, expected) => {
    expect(inferCategoryGroup(category)).toBe(expected);
  });

  it("leaves a blank detailed category unclassified", () => {
    expect(inferCategoryGroup(null)).toBeNull();
    expect(inferCategoryGroup("  ")).toBeNull();
  });

  it("prefers a stored valid group and safely falls back for old records", () => {
    expect(resolveCategoryGroup("outerwear", "shirt")).toBe("outerwear");
    expect(resolveCategoryGroup(null, "shorts")).toBe("bottoms");
    expect(resolveCategoryGroup(null, null)).toBe("other");
  });

  it("accepts only fixed category groups from wardrobe URLs", () => {
    expect(parseWardrobeFilter("tops")).toBe("tops");
    expect(parseWardrobeFilter("long-sleeve-shirt")).toBe("all");
    expect(parseWardrobeFilter(undefined)).toBe("all");
  });
});
