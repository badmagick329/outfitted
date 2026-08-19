import { describe, expect, it, vi } from "vitest";
import { OutfitService } from "./outfit-service";
import type { OutfitRepository } from "../domain/repository";

const item = {
  id: "item-1",
  name: "Teal shirt",
  description: null,
  category: "shirt",
  categoryGroup: "tops" as const,
  primaryColor: "teal",
  secondaryColors: ["navy"],
  material: null,
  fit: null,
  styleTags: [],
  seasons: [],
  formality: null,
  confidence: [],
  analysisStatus: "complete",
  excludedFromOutfitSuggestions: false,
};

function linkedRecommendation(...itemIds: string[]) {
  return `Wear ${itemIds.map((itemId) => `[${itemId}](item:${itemId})`).join(" with ")}.`;
}

function aiResult(
  candidates:
    | { recommendation: string; rationale: string; referencedItemIds: string[] }
    | Array<{ recommendation: string; rationale: string; referencedItemIds: string[] }>,
) {
  return {
    data: {
      candidates: (Array.isArray(candidates) ? candidates : [candidates]).map((candidate) => ({
        ...candidate,
        recommendation: candidate.recommendation.includes("(item:")
          ? candidate.recommendation
          : linkedRecommendation(...candidate.referencedItemIds),
        suitabilityTier: "A" as const,
      })),
    },
    model: "test-model",
    providerRequestId: "response-1",
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 20,
    },
  };
}

describe("OutfitService.create", () => {
  it("rejects an unavailable AI reference rather than truncating the candidate", async () => {
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      listExcludedItemIds: vi.fn().mockResolvedValue([]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi
        .fn()
        .mockResolvedValueOnce(
          aiResult({
            recommendation: linkedRecommendation("item-1", "other-user-item"),
            rationale: "A good match",
            referencedItemIds: ["item-1", "other-user-item"],
          }),
        )
        .mockResolvedValueOnce(
          aiResult({
            recommendation: linkedRecommendation("item-1"),
            rationale: "A good match",
            referencedItemIds: ["item-1"],
          }),
        ),
    };
    const service = new OutfitService(repository, ai);

    await expect(
      service.create("user-1", { prompt: "A dinner", selectedItemId: undefined }),
    ).resolves.toMatchObject({
      recommendation: linkedRecommendation("item-1"),
      referencedItemIds: ["item-1"],
    });
    expect(ai.suggest).toHaveBeenCalledTimes(2);
    expect(repository.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedItemIds: ["item-1"],
        recommendation: linkedRecommendation("item-1"),
      }),
    );
  });

  it("selects and stores the least repetitive valid candidate from one AI batch", async () => {
    const secondItem = { ...item, id: "item-2", name: "Stone trousers" };
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item, secondItem]),
      listExcludedItemIds: vi.fn().mockResolvedValue([]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([["item-1"]]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult([
          {
            recommendation: "Invalid",
            rationale: "No active garments",
            referencedItemIds: ["other-user-item"],
          },
          {
            recommendation: "Repeat the shirt",
            rationale: "Still suitable",
            referencedItemIds: ["item-1", "item-1"],
          },
          {
            recommendation: linkedRecommendation("item-2"),
            rationale: "A fresher option",
            referencedItemIds: ["item-2"],
          },
        ]),
      ),
    };
    const service = new OutfitService(repository, ai);

    await expect(
      service.create("user-1", { prompt: "A dinner", selectedItemId: undefined }),
    ).resolves.toMatchObject({
      recommendation: linkedRecommendation("item-2"),
      referencedItemIds: ["item-2"],
    });
    expect(ai.suggest).toHaveBeenCalledTimes(1);
    expect(repository.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedItemIds: ["item-2"],
        recommendation: linkedRecommendation("item-2"),
        rationale: "A fresher option",
      }),
    );
  });

  it("never sends excluded garments to AI or accepts one as a starting garment", async () => {
    const excludedItem = { ...item, id: "excluded-item", excludedFromOutfitSuggestions: true };
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item, excludedItem]),
      listExcludedItemIds: vi.fn().mockResolvedValue([]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult({
          recommendation: "Try the shirt",
          rationale: "A good match",
          referencedItemIds: ["item-1"],
        }),
      ),
    };
    const service = new OutfitService(repository, ai);

    await service.create("user-1", { prompt: "A dinner", selectedItemId: undefined });
    expect(ai.suggest).toHaveBeenCalledWith(
      expect.any(String),
      [expect.objectContaining({ id: "item-1" })],
      null,
      [],
    );
    await expect(
      service.create("user-1", { prompt: "A dinner", selectedItemId: "excluded-item" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("identifies a garment the user requires by both ID and name", async () => {
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      listExcludedItemIds: vi.fn().mockResolvedValue([]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([["item-1"], ["item-1"]]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult({
          recommendation: "Try the shirt",
          rationale: "A good match",
          referencedItemIds: ["item-1"],
        }),
      ),
    };
    const service = new OutfitService(repository, ai);

    await service.create("user-1", { prompt: "A dinner", selectedItemId: "item-1" });

    expect(ai.suggest).toHaveBeenCalledWith(
      expect.stringContaining("must include wardrobe item item-1, named Teal shirt"),
      expect.any(Array),
      null,
      [],
    );
  });

  it("passes the owner’s optional style profile to the AI", async () => {
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      listExcludedItemIds: vi.fn().mockResolvedValue([]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult({
          recommendation: "Try the shirt",
          rationale: "A good match",
          referencedItemIds: ["item-1"],
        }),
      ),
    };
    const styleProfile = {
      generalStyle: "Relaxed tailoring",
      preferences: "Roomy shirts",
      avoidances: "Very slim fits",
      occasionNotes: "",
    };
    const styleProfiles = { find: vi.fn().mockResolvedValue(styleProfile) };
    const service = new OutfitService(repository, ai, undefined, styleProfiles);

    await service.create("user-1", { prompt: "A dinner", selectedItemId: undefined });

    expect(styleProfiles.find).toHaveBeenCalledWith("user-1");
    expect(ai.suggest).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      styleProfile,
      [],
    );
  });

  it("passes complete garment context and saved or ignored combinations to the AI", async () => {
    const excludedItemIds = [["older-item-1", "older-item-2"]];
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      listExcludedItemIds: vi.fn().mockResolvedValue(excludedItemIds),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult({
          recommendation: "Try the shirt",
          rationale: "A good match",
          referencedItemIds: ["item-1"],
        }),
      ),
    };
    const service = new OutfitService(repository, ai);

    await service.create("user-1", { prompt: "A dinner", selectedItemId: undefined });

    expect(ai.suggest).toHaveBeenCalledWith(
      expect.any(String),
      [
        expect.objectContaining({
          categoryGroup: "tops",
          secondaryColors: ["navy"],
          recentSuggestionCount: 0,
          lastSuggestedPosition: null,
        }),
      ],
      null,
      excludedItemIds,
    );
    const wardrobe = ai.suggest.mock.calls[0]?.[1];
    expect(wardrobe?.[0]).not.toHaveProperty("confidence");
    expect(wardrobe?.[0]).not.toHaveProperty("analysisStatus");
  });

  it("adds compact recent usage without including the full suggestion history", async () => {
    const secondItem = { ...item, id: "item-2", name: "Stone trousers" };
    const neverSuggestedItem = { ...item, id: "item-3", name: "Berry jacket" };
    const recentSuggestionItemIds = [
      ["item-1", "item-2"],
      ["item-2"],
      ["item-1", "item-1"],
      ["item-2", "unavailable-item"],
    ];
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item, secondItem, neverSuggestedItem]),
      listExcludedItemIds: vi.fn().mockResolvedValue([]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue(recentSuggestionItemIds),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult({
          recommendation: "Try the shirt",
          rationale: "A good match",
          referencedItemIds: ["item-1"],
        }),
      ),
    };
    const service = new OutfitService(repository, ai);

    await service.create("user-1", { prompt: "A dinner", selectedItemId: undefined });

    expect(repository.listRecentSuggestionItemIds).toHaveBeenCalledWith("user-1", 20);
    expect(ai.suggest).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          id: "item-1",
          recentSuggestionCount: 2,
          lastSuggestedPosition: 0,
        }),
        expect.objectContaining({
          id: "item-2",
          recentSuggestionCount: 3,
          lastSuggestedPosition: 0,
        }),
        expect.objectContaining({
          id: "item-3",
          recentSuggestionCount: 0,
          lastSuggestedPosition: null,
        }),
      ]),
      null,
      [],
    );
  });

  it("retries once when the AI returns an excluded garment combination", async () => {
    const secondItem = { ...item, id: "item-2", name: "Stone trousers" };
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item, secondItem]),
      listExcludedItemIds: vi.fn().mockResolvedValue([["item-1"]]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi
        .fn()
        .mockResolvedValueOnce(
          aiResult({
            recommendation: "Try the shirt",
            rationale: "A good match",
            referencedItemIds: ["item-1"],
          }),
        )
        .mockResolvedValueOnce(
          aiResult({
            recommendation: linkedRecommendation("item-2"),
            rationale: "A different choice",
            referencedItemIds: ["item-2"],
          }),
        ),
    };
    const service = new OutfitService(repository, ai);

    await expect(
      service.create("user-1", { prompt: "A dinner", selectedItemId: undefined }),
    ).resolves.toMatchObject({ referencedItemIds: ["item-2"] });
    expect(ai.suggest).toHaveBeenCalledTimes(2);
    expect(ai.suggest.mock.calls[1]?.[0]).toContain("previous candidate batch did not contain");
  });

  it("returns a conflict after two unusable candidate batches", async () => {
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      listExcludedItemIds: vi.fn().mockResolvedValue([["item-1"]]),
      listRecentSuggestionItemIds: vi.fn().mockResolvedValue([]),
      createSuggestion: vi.fn(),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue(
        aiResult({
          recommendation: "Repeat the shirt",
          rationale: "A good match",
          referencedItemIds: ["item-1"],
        }),
      ),
    };
    const service = new OutfitService(repository, ai);

    await expect(
      service.create("user-1", { prompt: "A dinner", selectedItemId: undefined }),
    ).rejects.toMatchObject({ status: 409 });
    expect(ai.suggest).toHaveBeenCalledTimes(2);
    expect(repository.createSuggestion).not.toHaveBeenCalled();
  });
});

describe("OutfitService saved outfits", () => {
  it("returns an existing save instead of creating a duplicate", async () => {
    const existing = { id: "saved-1", suggestionId: "suggestion-1" };
    const repository = {
      findSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
      findSaved: vi.fn().mockResolvedValue(existing),
      updateSuggestion: vi.fn(),
      save: vi.fn(),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, { suggest: vi.fn() });

    await expect(
      service.save("user-1", {
        suggestionId: "suggestion-1",
        name: "Dinner",
        recommendation: "Wear the teal shirt.",
        rationale: "The colour works.",
        referencedItemIds: ["item-1"],
      }),
    ).resolves.toBe(existing);
    expect(repository.updateSuggestion).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("persists garment and explanation edits before saving", async () => {
    const repository = {
      findSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
      findSaved: vi.fn().mockResolvedValue(null),
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      updateSuggestion: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue({ id: "saved-1" }),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, { suggest: vi.fn() });

    await service.save("user-1", {
      suggestionId: "suggestion-1",
      name: "Dinner",
      recommendation: "Wear the teal shirt.",
      rationale: "The colour works.",
      referencedItemIds: ["item-1"],
    });

    expect(repository.updateSuggestion).toHaveBeenCalledWith("user-1", "suggestion-1", {
      selectedItemIds: ["item-1"],
      recommendation: "Wear the teal shirt.",
      rationale: "The colour works.",
    });
    expect(repository.save).toHaveBeenCalledWith("user-1", "suggestion-1", "Dinner");
  });

  it("rejects a swapped garment outside the active wardrobe", async () => {
    const repository = {
      findSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
      findSaved: vi.fn().mockResolvedValue(null),
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      updateSuggestion: vi.fn(),
      save: vi.fn(),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, { suggest: vi.fn() });

    await expect(
      service.save("user-1", {
        suggestionId: "suggestion-1",
        name: "Dinner",
        recommendation: "Wear another garment.",
        rationale: null,
        referencedItemIds: ["other-item"],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.updateSuggestion).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("does not remove a saved outfit owned by someone else", async () => {
    const repository = {
      findSavedById: vi.fn().mockResolvedValue(null),
      deleteSaved: vi.fn(),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, { suggest: vi.fn() });

    await expect(service.removeSaved("user-1", "saved-1")).rejects.toMatchObject({
      status: 404,
    });
    expect(repository.deleteSaved).not.toHaveBeenCalled();
  });

  it("stores an ignored outfit as a canonical garment set", async () => {
    const repository = {
      findSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
      listActiveWardrobe: vi
        .fn()
        .mockResolvedValue([item, { ...item, id: "item-2", name: "Stone trousers" }]),
      updateSuggestion: vi.fn().mockResolvedValue(undefined),
      ignore: vi.fn().mockResolvedValue(undefined),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, { suggest: vi.fn() });

    await service.ignore("user-1", {
      suggestionId: "suggestion-1",
      recommendation: "Wear both garments.",
      rationale: "They work together.",
      referencedItemIds: ["item-2", "item-1"],
    });

    expect(repository.updateSuggestion).toHaveBeenCalledWith("user-1", "suggestion-1", {
      selectedItemIds: ["item-1", "item-2"],
      recommendation: "Wear both garments.",
      rationale: "They work together.",
    });
    expect(repository.ignore).toHaveBeenCalledWith({
      ownerId: "user-1",
      suggestionId: "suggestion-1",
      selectedItemIds: ["item-1", "item-2"],
      itemSignature: "item-1:item-2",
    });
  });
});
