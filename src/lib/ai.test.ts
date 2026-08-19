import { describe, expect, it } from "vitest";
import {
  buildGarmentAnalysisPrompt,
  buildOutfitRequest,
  buildOutfitSuggestionPrompt,
  buildWardrobeReviewPrompt,
} from "./ai-prompts";
import { outfitSuggestionBatchSchema } from "./ai";

describe("garment analysis instructions", () => {
  const garmentAnalysisInstructions = buildGarmentAnalysisPrompt();
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

    expect(garmentAnalysisInstructions).toContain("T-shirt");
    expect(garmentAnalysisInstructions).toContain("Spring, Summer, Autumn, Winter");
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

  it("supplies established style tags while allowing useful new ones", () => {
    const prompt = buildGarmentAnalysisPrompt([{ value: "Minimalist", count: 11 }]);
    expect(prompt).toContain("EXISTING STYLE-TAG VOCABULARY");
    expect(prompt).toContain("Minimalist (11)");
    expect(prompt).toContain("Create a new tag only when it is genuinely distinct");
  });
});

describe("buildOutfitSuggestionPrompt", () => {
  it("asks for a varied set of independently suitable outfit candidates", () => {
    const prompt = buildOutfitSuggestionPrompt("A relaxed Saturday", [
      { id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d", name: "Teal shirt" },
    ]);

    expect(prompt).toContain("set of one to four independently recommendation-worthy outfits");
    expect(prompt).toContain("Do not include filler merely to reach four candidates");
    expect(prompt).toContain("Maximise meaningful garment variation across the candidate set");
    expect(prompt).toContain("do not build every candidate around the same dominant top");
    expect(prompt).toContain("Each candidate's referencedItemIds must contain every garment");
    expect(prompt).toContain("identify plausible candidates for each role");
    expect(prompt).toContain("All candidates must include an explicitly selected garment");
    expect(prompt).toContain("Markdown link in exactly this format");
    expect(prompt).toContain("treat input order as arbitrary");
    expect(prompt).toContain("A relaxed Saturday");
    expect(prompt).not.toContain("strongest");
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

  it("uses recent garment use as soft guidance for a varied candidate set", () => {
    const prompt = buildOutfitSuggestionPrompt("Dinner", []);

    expect(prompt).toContain("Recent suggestion information is soft guidance");
    expect(prompt).toContain("recentSuggestionCount 0");
    expect(prompt).toContain("a lower lastSuggestedPosition means it was used more recently");
    expect(prompt).toContain("Never treat recent use as a hard exclusion");
    expect(prompt).toContain("explicitly selected garment");
  });

  it("requires a non-empty batch of at most four candidates", () => {
    const candidate = {
      recommendation: "Wear the shirt",
      rationale: "It works",
      referencedItemIds: ["7c1bcc30-61e7-4b82-bb99-bd73f33d926d"],
      suitabilityTier: "A",
    };

    expect(outfitSuggestionBatchSchema.parse({ candidates: [candidate] }).candidates).toHaveLength(
      1,
    );
    expect(() => outfitSuggestionBatchSchema.parse({ candidates: [] })).toThrow();
    expect(() =>
      outfitSuggestionBatchSchema.parse({ candidates: Array(5).fill(candidate) }),
    ).toThrow();
  });

  it("requires A, B, or C suitability tiers", () => {
    const candidate = {
      recommendation: "Wear the shirt",
      rationale: "It works",
      referencedItemIds: ["7c1bcc30-61e7-4b82-bb99-bd73f33d926d"],
    };
    expect(() => outfitSuggestionBatchSchema.parse({ candidates: [candidate] })).toThrow();
    expect(() =>
      outfitSuggestionBatchSchema.parse({ candidates: [{ ...candidate, suitabilityTier: "D" }] }),
    ).toThrow();
  });

  it("defines suitability tiers and protects them from variety pressure", () => {
    const prompt = buildOutfitSuggestionPrompt("Dinner", []);
    expect(prompt).toContain("A means confidently recommend");
    expect(prompt).toContain("Never mark a weaker outfit A merely to create variety");
  });

  it("treats another-outfit context as temporary variety intent, not dislike", () => {
    const request = buildOutfitRequest("Dinner", undefined, false, [
      "7c1bcc30-61e7-4b82-bb99-bd73f33d926d",
    ]);
    expect(request).toContain("temporary variety intent, not dislike");
    expect(request).toContain("meaningfully different option");
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
