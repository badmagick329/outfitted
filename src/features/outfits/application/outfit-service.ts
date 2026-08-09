import { notFound } from "@/shared/application-error";
import type { CreateOutfitSuggestionInput, SaveOutfitInput } from "../domain/contracts";
import type { OutfitAi } from "../domain/ports";
import type { OutfitRepository } from "../domain/repository";

export class OutfitService {
  constructor(
    private readonly repository: OutfitRepository,
    private readonly ai: OutfitAi,
  ) {}

  async create(ownerId: string, input: CreateOutfitSuggestionInput) {
    const items = await this.repository.listActiveWardrobe(ownerId);
    if (input.selectedItemId && !items.some((item) => item.id === input.selectedItemId))
      throw notFound("Selected garment not found");
    const selected = input.selectedItemId
      ? items.find((item) => item.id === input.selectedItemId)
      : undefined;
    const result = await this.ai.suggest(
      selected
        ? `${input.prompt}\nThe user explicitly wants to use: ${selected.name}.`
        : input.prompt,
      items.map(
        ({
          id,
          name,
          description,
          category,
          primaryColor,
          material,
          fit,
          styleTags,
          seasons,
          formality,
        }) => ({
          id,
          name,
          description,
          category,
          primaryColor,
          material,
          fit,
          styleTags,
          seasons,
          formality,
        }),
      ),
    );
    const allowedIds = new Set(items.map((item) => item.id));
    const referencedItemIds = result.referencedItemIds.filter((id) => allowedIds.has(id));
    const suggestion = await this.repository.createSuggestion({
      ownerId,
      request: input.prompt,
      selectedItemIds: referencedItemIds,
      recommendation: result.recommendation,
      rationale: result.rationale,
    });
    return { ...suggestion, referencedItemIds };
  }

  async save(ownerId: string, input: SaveOutfitInput) {
    if (!(await this.repository.findSuggestion(ownerId, input.suggestionId)))
      throw notFound("Outfit suggestion not found");
    return this.repository.save(ownerId, input.suggestionId, input.name);
  }
}
