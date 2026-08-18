import { conflict, notFound } from "@/shared/application-error";
import { buildOutfitRequest } from "@/lib/ai-prompts";
import { trackAiCall } from "@/features/ai-usage/application/track-ai-call";
import type {
  CreateOutfitSuggestionInput,
  IgnoreOutfitInput,
  SaveOutfitInput,
} from "../domain/contracts";
import { canonicalOutfitItemIds, outfitSignature } from "../domain/outfit-signature";
import type { OutfitAi, OutfitAiUsageRecorder, OutfitStyleProfileReader } from "../domain/ports";
import type { OutfitRepository } from "../domain/repository";

export class OutfitService {
  constructor(
    private readonly repository: OutfitRepository,
    private readonly ai: OutfitAi,
    private readonly usageRecorder?: OutfitAiUsageRecorder,
    private readonly styleProfiles?: OutfitStyleProfileReader,
  ) {}

  async create(ownerId: string, input: CreateOutfitSuggestionInput) {
    const [items, styleProfile, excludedOutfitItemIds] = await Promise.all([
      this.repository.listActiveWardrobe(ownerId),
      this.styleProfiles?.find(ownerId) ?? Promise.resolve(null),
      this.repository.listExcludedItemIds(ownerId),
    ]);
    if (input.selectedItemId && !items.some((item) => item.id === input.selectedItemId))
      throw notFound("Selected garment not found");
    const selected = input.selectedItemId
      ? items.find((item) => item.id === input.selectedItemId)
      : undefined;
    const request = buildOutfitRequest(input.prompt, selected);
    const wardrobe = items.map(
      ({
        id,
        name,
        description,
        category,
        categoryGroup,
        primaryColor,
        secondaryColors,
        material,
        fit,
        styleTags,
        seasons,
        formality,
        confidence,
        analysisStatus,
      }) => ({
        id,
        name,
        description,
        category,
        categoryGroup,
        primaryColor,
        secondaryColors,
        material,
        fit,
        styleTags,
        seasons,
        formality,
        confidence,
        analysisStatus,
      }),
    );
    const suggest = (retry: boolean) =>
      trackAiCall({
        recorder: this.usageRecorder,
        userId: ownerId,
        operation: "outfit_suggestion",
        model: this.ai.model ?? "unknown",
        call: () =>
          this.ai.suggest(
            retry ? buildOutfitRequest(input.prompt, selected, true) : request,
            wardrobe,
            styleProfile,
            excludedOutfitItemIds,
          ),
      });
    let result = await suggest(false);
    const allowedIds = new Set(items.map((item) => item.id));
    const sanitizeItemIds = (itemIds: string[]) =>
      itemIds.filter((id, index) => allowedIds.has(id) && itemIds.indexOf(id) === index);
    const excludedSignatures = new Set(excludedOutfitItemIds.map(outfitSignature));
    let referencedItemIds = sanitizeItemIds(result.referencedItemIds);
    if (referencedItemIds.length && excludedSignatures.has(outfitSignature(referencedItemIds))) {
      result = await suggest(true);
      referencedItemIds = sanitizeItemIds(result.referencedItemIds);
    }
    if (!referencedItemIds.length)
      throw conflict("We couldn’t form an outfit from the available garments.");
    if (excludedSignatures.has(outfitSignature(referencedItemIds)))
      throw conflict("There isn’t a different outfit to suggest from the available garments.");
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

  async ignore(ownerId: string, input: IgnoreOutfitInput) {
    if (!(await this.repository.findSuggestion(ownerId, input.suggestionId)))
      throw notFound("Outfit suggestion not found");
    const activeItemIds = new Set(
      (await this.repository.listActiveWardrobe(ownerId)).map((item) => item.id),
    );
    if (input.referencedItemIds.some((itemId) => !activeItemIds.has(itemId)))
      throw conflict("One or more garments in this outfit are no longer available.");
    const selectedItemIds = canonicalOutfitItemIds(input.referencedItemIds);
    await this.repository.updateSuggestion(ownerId, input.suggestionId, {
      selectedItemIds,
      recommendation: input.recommendation,
      rationale: input.rationale,
    });
    await this.repository.ignore({
      ownerId,
      suggestionId: input.suggestionId,
      selectedItemIds,
      itemSignature: outfitSignature(selectedItemIds),
    });
  }

  async removeSaved(ownerId: string, savedOutfitId: string) {
    if (!(await this.repository.findSavedById(ownerId, savedOutfitId)))
      throw notFound("Saved outfit not found");
    await this.repository.deleteSaved(ownerId, savedOutfitId);
  }
}
