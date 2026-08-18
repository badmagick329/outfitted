import { describe, expect, it } from "vitest";
import {
  inferCategoryGroup,
  parseWardrobeFilter,
  quickCategoryGroupOptions,
  categoryGroupForCategory,
  detailedCategorySchema,
  formalitySchema,
  resolveCategoryGroup,
} from "./category-groups";

describe("wardrobe category groups", () => {
  it("uses controlled detailed categories and formality values", () => {
    expect(detailedCategorySchema.parse("T-shirt")).toBe("T-shirt");
    expect(detailedCategorySchema.safeParse("Button-up shirt").success).toBe(false);
    expect(categoryGroupForCategory("Dress")).toBe("dresses-jumpsuits");
    expect(formalitySchema.parse("Smart casual")).toBe("Smart casual");
    expect(formalitySchema.safeParse("Office").success).toBe(false);
  });
  it("limits quick section controls without removing other section values", () => {
    expect(quickCategoryGroupOptions.map((option) => option.value)).toEqual([
      "tops",
      "bottoms",
      "outerwear",
    ]);
  });
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
