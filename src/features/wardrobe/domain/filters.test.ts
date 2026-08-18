import { describe, expect, it } from "vitest";
import {
  filterWardrobeItems,
  matchesWardrobeFilters,
  parseWardrobeFilters,
  parseWardrobeReturnTo,
  validatedWardrobeReturnTo,
  wardrobeFacets,
  wardrobeItemNavigation,
  wardrobeScrollKey,
} from "./filters";

const items = [
  { category: " T-shirt ", categoryGroup: "tops", styleTags: ["Casual", "Minimalist"] },
  { category: "Button-up shirt", categoryGroup: "tops", styleTags: ["Smart"] },
];
const facets = wardrobeFacets(items);

describe("wardrobe filters", () => {
  it("counts normalized categories and style tags across the active wardrobe", () => {
    const activeItems = [
      {
        category: " T-shirt ",
        categoryGroup: "tops",
        styleTags: ["Music merchandise", " technical ", "music merchandise"],
      },
      {
        category: "t-shirt",
        categoryGroup: "tops",
        styleTags: ["MUSIC   MERCHANDISE", "Technical"],
      },
      {
        category: " Button-up   shirt ",
        categoryGroup: "tops",
        styleTags: ["Technical"],
      },
    ];

    expect(wardrobeFacets(activeItems)).toEqual({
      categories: [
        { value: "button-up shirt", label: "Button-up shirt", count: 1 },
        { value: "t-shirt", label: "T-shirt", count: 2 },
      ],
      tags: [
        { value: "music merchandise", label: "Music merchandise", count: 2 },
        { value: "technical", label: "technical", count: 3 },
      ],
    });
  });

  it("leaves active-wardrobe facet counts unchanged when filters are selected", () => {
    const activeItems = [
      { category: "T-shirt", categoryGroup: "tops", styleTags: ["Casual", "Technical"] },
      { category: "Jeans", categoryGroup: "bottoms", styleTags: ["Casual"] },
    ];
    const activeFacets = wardrobeFacets(activeItems);
    const filters = parseWardrobeFilters({ category: "t-shirt", tag: "technical" }, activeFacets);

    expect(activeItems.filter((item) => matchesWardrobeFilters(item, filters))).toHaveLength(1);
    expect(activeFacets).toEqual({
      categories: [
        { value: "jeans", label: "Jeans", count: 1 },
        { value: "t-shirt", label: "T-shirt", count: 1 },
      ],
      tags: [
        { value: "casual", label: "Casual", count: 2 },
        { value: "technical", label: "Technical", count: 1 },
      ],
    });
  });

  it("excludes archived garments by building facets from the active-wardrobe source", () => {
    const wardrobe = [
      { category: "T-shirt", categoryGroup: "tops", styleTags: ["Casual"], archivedAt: null },
      {
        category: "Coat",
        categoryGroup: "outerwear",
        styleTags: ["Formal"],
        archivedAt: new Date(),
      },
    ];
    const activeItems = wardrobe.filter((item) => item.archivedAt === null);

    expect(wardrobeFacets(activeItems)).toEqual({
      categories: [{ value: "t-shirt", label: "T-shirt", count: 1 }],
      tags: [{ value: "casual", label: "Casual", count: 1 }],
    });
  });

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

  it("reuses wardrobe filters to build non-wrapping garment navigation", () => {
    const activeItems = [
      { id: "one", category: "T-shirt", categoryGroup: "tops", styleTags: ["Casual"] },
      { id: "two", category: "Shirt", categoryGroup: "tops", styleTags: ["Smart"] },
      { id: "three", category: "Jeans", categoryGroup: "bottoms", styleTags: ["Casual"] },
    ];
    const filtered = filterWardrobeItems(
      activeItems,
      parseWardrobeReturnTo("/wardrobe?section=tops", wardrobeFacets(activeItems)),
    );

    expect(filtered.map((item) => item.id)).toEqual(["one", "two"]);
    expect(wardrobeItemNavigation(filtered, "one")).toEqual({
      index: 0,
      total: 2,
      previousItemId: null,
      nextItemId: "two",
    });
    expect(wardrobeItemNavigation(filtered, "two")).toEqual({
      index: 1,
      total: 2,
      previousItemId: "one",
      nextItemId: null,
    });
  });
});
