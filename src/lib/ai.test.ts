import { describe, expect, it } from "vitest";
import { buildOutfitSuggestionPrompt } from "./ai";

describe("buildOutfitSuggestionPrompt", () => {
  it("asks for one coherent outfit rather than a collection of suggestions", () => {
    const prompt = buildOutfitSuggestionPrompt("A relaxed Saturday", [
      { id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d", name: "Teal shirt" },
    ]);

    expect(prompt).toContain("one complete, coherent outfit");
    expect(prompt).toContain("Do not return a collection of merely relevant items");
    expect(prompt).toContain("referencedItemIds must contain every garment");
    expect(prompt).toContain("A relaxed Saturday");
  });
});
