import { describe, expect, it, vi } from "vitest";
import { OutfitService } from "./outfit-service";
import type { OutfitRepository } from "../domain/repository";

const item = {
  id: "item-1",
  name: "Teal shirt",
  description: null,
  category: "shirt",
  primaryColor: "teal",
  material: null,
  fit: null,
  styleTags: [],
  seasons: [],
  formality: null,
};

describe("OutfitService.create", () => {
  it("filters AI references to the owner’s active wardrobe", async () => {
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue({
        recommendation: "Try the shirt",
        rationale: "A good match",
        referencedItemIds: ["item-1", "other-user-item"],
      }),
    };
    const service = new OutfitService(repository, ai);

    await expect(
      service.create("user-1", { prompt: "A dinner", selectedItemId: undefined }),
    ).resolves.toMatchObject({ referencedItemIds: ["item-1"] });
    expect(repository.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ selectedItemIds: ["item-1"] }),
    );
  });

  it("identifies a garment the user requires by both ID and name", async () => {
    const repository = {
      listActiveWardrobe: vi.fn().mockResolvedValue([item]),
      createSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
    } as unknown as OutfitRepository;
    const ai = {
      suggest: vi.fn().mockResolvedValue({
        recommendation: "Try the shirt",
        rationale: "A good match",
        referencedItemIds: ["item-1"],
      }),
    };
    const service = new OutfitService(repository, ai);

    await service.create("user-1", { prompt: "A dinner", selectedItemId: "item-1" });

    expect(ai.suggest).toHaveBeenCalledWith(
      expect.stringContaining("must include wardrobe item item-1, named Teal shirt"),
      expect.any(Array),
    );
  });
});

describe("OutfitService saved outfits", () => {
  it("returns an existing save instead of creating a duplicate", async () => {
    const existing = { id: "saved-1", suggestionId: "suggestion-1" };
    const repository = {
      findSuggestion: vi.fn().mockResolvedValue({ id: "suggestion-1" }),
      findSaved: vi.fn().mockResolvedValue(existing),
      save: vi.fn(),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, { suggest: vi.fn() });

    await expect(
      service.save("user-1", { suggestionId: "suggestion-1", name: "Dinner" }),
    ).resolves.toBe(existing);
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
});
