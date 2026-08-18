import { describe, expect, it } from "vitest";
import {
  normalizeGarmentMetadata,
  normalizeMetadataList,
  normalizeMetadataText,
  normalizeSeasons,
  styleTagVocabulary,
} from "./metadata";
import { normalizeExistingWardrobeMetadata } from "./metadata-maintenance";

describe("garment metadata normalization", () => {
  it("trims whitespace and stably removes case-only duplicates", () => {
    expect(normalizeMetadataText("  Soft   cotton  ")).toBe("Soft cotton");
    expect(normalizeMetadataList(["casual", " Casual ", "CASUAL", "minimalist", "  "])).toEqual([
      "casual",
      "minimalist",
    ]);
  });

  it("reuses established display spelling without merging different concepts", () => {
    expect(
      normalizeGarmentMetadata(
        { styleTags: ["minimalist", "Workwear", "workwear"] },
        { styleTags: ["Minimalist"] },
      ).styleTags,
    ).toEqual(["Minimalist", "Workwear"]);
  });

  it("counts a user vocabulary case-insensitively", () => {
    expect(
      styleTagVocabulary([{ styleTags: ["Casual", "Minimalist"] }, { styleTags: [" casual "] }]),
    ).toEqual([
      { value: "Casual", count: 2 },
      { value: "Minimalist", count: 1 },
    ]);
  });

  it("canonicalizes known seasons while preserving unexpected legacy values", () => {
    expect(normalizeSeasons(["summer", "Fall", "Monsoon", " autumn "])).toEqual([
      "Summer",
      "Autumn",
      "Monsoon",
    ]);
  });
});

describe("existing metadata maintenance", () => {
  it("only performs safe cleanup and controlled case-only conversions", () => {
    const [item] = normalizeExistingWardrobeMetadata([
      {
        userId: "user-1",
        name: "  Blue   shirt ",
        description: "  Crisp   cotton ",
        category: "t-shirt",
        primaryColor: " Blue ",
        secondaryColors: [" Navy ", "navy", ""],
        material: " Cotton ",
        fit: " Regular ",
        styleTags: ["Casual", " casual "],
        seasons: [" Summer ", "Fall", "summer"],
        formality: "smart casual",
      },
    ]);
    expect(item).toMatchObject({
      name: "Blue shirt",
      category: "T-shirt",
      formality: "Smart casual",
      secondaryColors: ["Navy"],
      styleTags: ["Casual"],
      seasons: ["Summer", "Autumn"],
    });
  });
});
