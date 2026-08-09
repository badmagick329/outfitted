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
});
