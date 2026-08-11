import { describe, expect, it } from "vitest";
import {
  buildOutfitSuggestionPrompt,
  buildWardrobeReviewPrompt,
  garmentAnalysisInstructions,
} from "./ai";

describe("garment analysis instructions", () => {
  it("explains that the record must stand in for the original images", () => {
    expect(garmentAnalysisInstructions).toContain("only representation available to other models");
    expect(garmentAnalysisInstructions).toContain("will not receive the images");
    expect(garmentAnalysisInstructions).toContain("distinguish this garment from similar pieces");
    expect(garmentAnalysisInstructions).toContain("without writing an essay");
  });

  it("gives every structured field a distinct responsibility", () => {
    for (const field of [
      "name",
      "description",
      "category",
      "categoryGroup",
      "primaryColor",
      "secondaryColors",
      "material",
      "fit",
      "styleTags",
      "seasons",
      "formality",
      "confidence",
    ]) {
      expect(garmentAnalysisInstructions).toContain(`\n${field}:`);
    }

    expect(garmentAnalysisInstructions).toContain("concise, specific garment type");
    expect(garmentAnalysisInstructions).toContain(
      "tops, bottoms, outerwear, dresses-jumpsuits, other",
    );
    expect(garmentAnalysisInstructions).toContain("Do not repeat its category");
  });

  it("keeps uncertainty useful instead of mixing incompatible interpretations", () => {
    expect(garmentAnalysisInstructions).toContain("Clearly separate observed facts");
    expect(garmentAnalysisInstructions).toContain("put any meaningful uncertainty in confidence");
    expect(garmentAnalysisInstructions).toContain(
      "Do not turn an uncertain interpretation into a definitive style tag",
    );
    expect(garmentAnalysisInstructions).toContain(
      "Do not combine materially different interpretations",
    );
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
    expect(prompt).toContain("identify the plausible candidates for each role");
    expect(prompt).toContain("treat input order as arbitrary");
    expect(prompt).toContain("A relaxed Saturday");
    expect(prompt).not.toContain("USER STYLE PROFILE");
    expect(prompt).not.toContain("OUTFITS ALREADY SAVED OR IGNORED");
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

  it("excludes saved and ignored garment combinations by ID without banning individual items", () => {
    const prompt = buildOutfitSuggestionPrompt(
      "Dinner",
      [
        { id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d", name: "Teal shirt" },
        { id: "f2644611-9961-49d0-bfc4-adac960ca7f0", name: "Stone trousers" },
      ],
      null,
      [["7c1bcc30-61e7-4b82-bb99-bd73f33d926d", "f2644611-9961-49d0-bfc4-adac960ca7f0"]],
    );

    expect(prompt).toContain("OUTFITS ALREADY SAVED OR IGNORED");
    expect(prompt).toContain("unordered set of garment IDs");
    expect(prompt).toContain("Individual garments may still be used");
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
