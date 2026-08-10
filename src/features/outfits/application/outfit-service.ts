import { conflict, notFound } from "@/shared/application-error";
import { trackAiCall } from "@/features/ai-usage/application/track-ai-call";
import type { CreateOutfitSuggestionInput, SaveOutfitInput } from "../domain/contracts";
import type { OutfitAi, OutfitAiUsageRecorder } from "../domain/ports";
import type { OutfitRepository } from "../domain/repository";

export class OutfitService {
  constructor(
    private readonly repository: OutfitRepository,
    private readonly ai: OutfitAi,
    private readonly usageRecorder?: OutfitAiUsageRecorder,
  ) {}

  async create(ownerId: string, input: CreateOutfitSuggestionInput) {
    const items = await this.repository.listActiveWardrobe(ownerId);
    if (input.selectedItemId && !items.some((item) => item.id === input.selectedItemId))
      throw notFound("Selected garment not found");
    const selected = input.selectedItemId
      ? items.find((item) => item.id === input.selectedItemId)
      : undefined;
    const result = await trackAiCall({
      recorder: this.usageRecorder,
      userId: ownerId,
      operation: "outfit_suggestion",
      model: this.ai.model ?? "unknown",
      call: () =>
        this.ai.suggest(
          selected
            ? `${input.prompt}\nThe chosen outfit must include wardrobe item ${selected.id}, named ${selected.name}.`
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
        ),
    });
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

  listSaved(ownerId: string) {
    return this.repository.listSaved(ownerId);
  }

  async save(ownerId: string, input: SaveOutfitInput) {
    if (!(await this.repository.findSuggestion(ownerId, input.suggestionId)))
      throw notFound("Outfit suggestion not found");
    const existing = await this.repository.findSaved(ownerId, input.suggestionId);
    if (existing) return existing;
    const activeItemIds = new Set(
      (await this.repository.listActiveWardrobe(ownerId)).map((item) => item.id),
    );
    if (input.referencedItemIds.some((itemId) => !activeItemIds.has(itemId)))
      throw conflict("One or more garments in this outfit are no longer available.");
    await this.repository.updateSuggestion(ownerId, input.suggestionId, {
      selectedItemIds: input.referencedItemIds,
      recommendation: input.recommendation,
      rationale: input.rationale,
    });
    return this.repository.save(ownerId, input.suggestionId, input.name);
  }

  async removeSaved(ownerId: string, savedOutfitId: string) {
    if (!(await this.repository.findSavedById(ownerId, savedOutfitId)))
      throw notFound("Saved outfit not found");
    await this.repository.deleteSaved(ownerId, savedOutfitId);
  }
}
