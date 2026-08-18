import { describe, expect, it } from "vitest";
import {
  matchesWardrobeFilters,
  parseWardrobeFilters,
  validatedWardrobeReturnTo,
  wardrobeFacets,
  wardrobeScrollKey,
} from "./filters";

const items = [
  { category: " T-shirt ", categoryGroup: "tops", styleTags: ["Casual", "Minimalist"] },
  { category: "Button-up shirt", categoryGroup: "tops", styleTags: ["Smart"] },
];
const facets = wardrobeFacets(items);

describe("wardrobe filters", () => {
  it("normalizes repeated URL values and applies OR within groups", () => {
    const filters = parseWardrobeFilters(
      { section: "tops", category: ["t-shirt", "Button-up   shirt"], tag: [" casual ", "smart"] },
      facets,
    );
    expect(filters).toEqual({
      section: "tops",
      categories: ["t-shirt", "Button-up shirt"],
      tags: ["casual", "smart"],
    });
    expect(items.filter((item) => matchesWardrobeFilters(item, filters))).toHaveLength(2);
  });

  it("ignores unsupported facet values and rejects unsafe return destinations", () => {
    expect(
      parseWardrobeFilters({ section: "invalid", category: "coat", tag: "formal" }, facets),
    ).toEqual({ section: null, categories: [], tags: [] });
    expect(validatedWardrobeReturnTo("https://bad.example/wardrobe")).toBe("/wardrobe");
    expect(validatedWardrobeReturnTo("/items/x")).toBe("/wardrobe");
    expect(validatedWardrobeReturnTo("/wardrobe?section=tops&tag=casual")).toBe(
      "/wardrobe?section=tops&tag=casual",
    );
  });

  it("uses distinct scroll keys for distinct filter URLs", () => {
    expect(wardrobeScrollKey("/wardrobe?section=tops")).not.toBe(
      wardrobeScrollKey("/wardrobe?section=bottoms"),
    );
  });
});
