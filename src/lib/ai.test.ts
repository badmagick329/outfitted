import { describe, expect, it } from "vitest";
import {
  buildOutfitSuggestionPrompt,
  buildWardrobeReviewPrompt,
  garmentAnalysisInstructions,
} from "./ai";

describe("garment analysis instructions", () => {
  it("keeps a specific category while requiring a fixed broad category group", () => {
    expect(garmentAnalysisInstructions).toContain("concise, specific garment type");
    expect(garmentAnalysisInstructions).toContain(
      "tops, bottoms, outerwear, dresses-jumpsuits, other",
    );
    expect(garmentAnalysisInstructions).toContain("Do not use categoryGroup for sleeve length");
  });
});

describe("buildOutfitSuggestionPrompt", () => {
  it("asks for one coherent outfit rather than a collection of suggestions", () => {
    const prompt = buildOutfitSuggestionPrompt("A relaxed Saturday", [
      { id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d", name: "Teal shirt" },
    ]);

    expect(prompt).toContain("one complete, coherent outfit");
    expect(prompt).toContain("Do not return a collection of merely relevant items");
    expect(prompt).toContain("referencedItemIds must contain every garment");
    expect(prompt).toContain("A relaxed Saturday");
    expect(prompt).not.toContain("USER STYLE PROFILE");
  });

  it("includes optional style notes as soft preference data", () => {
    const prompt = buildOutfitSuggestionPrompt("Dinner", [], {
      generalStyle: "Relaxed tailoring",
      preferences: "Wide trousers",
      avoidances: "Very slim fits",
      occasionNotes: "Keep dinners polished but comfortable",
    });

    expect(prompt).toContain("USER STYLE PROFILE");
    expect(prompt).toContain("Relaxed tailoring");
    expect(prompt).toContain("soft preference data");
    expect(prompt).toContain("current request and any explicitly selected garment take priority");
  });
});

describe("buildWardrobeReviewPrompt", () => {
  it("permits an honest no-gap result and rejects manufactured shopping needs", () => {
    const prompt = buildWardrobeReviewPrompt([
      {
        id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d",
        name: "Teal shirt",
        description: null,
        category: "shirt",
        categoryGroup: "tops",
        primaryColor: "teal",
        secondaryColors: [],
        material: null,
        fit: null,
        styleTags: [],
        seasons: [],
        formality: null,
        analysisStatus: "complete",
        updatedAt: new Date(),
        coverPhotoId: null,
      },
    ]);

    expect(prompt).toContain("Do not invent gaps");
    expect(prompt).toContain("return an empty array");
    expect(prompt).toContain("Never disguise an optional shopping idea as a gap");
    expect(prompt).not.toContain("USER STYLE PROFILE");
  });
});
