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
import {
  itemsByRole,
  qualityGateCandidates,
  recentSuggestionUsageByItemId,
  selectCandidateWithDiagnostics,
  validOutfitCandidates,
} from "./outfit-candidate-selection";

const recentSuggestionHistoryLimit = 20;

export class OutfitService {
  constructor(
    private readonly repository: OutfitRepository,
    private readonly ai: OutfitAi,
    private readonly usageRecorder?: OutfitAiUsageRecorder,
    private readonly styleProfiles?: OutfitStyleProfileReader,
  ) {}

  async create(ownerId: string, input: CreateOutfitSuggestionInput) {
    const requestMode = input.requestMode ?? "initial";
    const [activeItems, styleProfile, excludedOutfitItemIds, recentSuggestionItemIds] =
      await Promise.all([
        this.repository.listActiveWardrobe(ownerId),
        this.styleProfiles?.find(ownerId) ?? Promise.resolve(null),
        this.repository.listExcludedItemIds(ownerId),
        this.repository.listRecentSuggestionItemIds(ownerId, recentSuggestionHistoryLimit),
      ]);
    const items = activeItems.filter((item) => !item.excludedFromOutfitSuggestions);
    if (input.selectedItemId && !items.some((item) => item.id === input.selectedItemId))
      throw notFound("Selected garment not found");
    const selected = input.selectedItemId
      ? items.find((item) => item.id === input.selectedItemId)
      : undefined;
    if (requestMode === "another") {
      if (!input.previousItemIds?.length)
        throw conflict("The outfit currently shown is needed to suggest another option.");
      const eligibleItemIds = new Set(items.map((item) => item.id));
      if (input.previousItemIds.some((itemId) => !eligibleItemIds.has(itemId)))
        throw conflict("One or more garments in the displayed outfit are no longer available.");
    }
    const previousItemIds = requestMode === "another" ? input.previousItemIds : undefined;
    const request = buildOutfitRequest(input.prompt, selected, false, previousItemIds);
    const recentUsageByItemId = recentSuggestionUsageByItemId(recentSuggestionItemIds);
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
        recentSuggestionCount: recentUsageByItemId.get(id)?.recentSuggestionCount ?? 0,
        lastSuggestedPosition: recentUsageByItemId.get(id)?.lastSuggestedPosition ?? null,
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
            retry ? buildOutfitRequest(input.prompt, selected, true, previousItemIds) : request,
            wardrobe,
            styleProfile,
            excludedOutfitItemIds,
          ),
      });
    const allowedIds = new Set(items.map((item) => item.id));
    const excludedSignatures = new Set(excludedOutfitItemIds.map(outfitSignature));
    let attemptCount = 1;
    let batch = (await suggest(false)).candidates;
    let generatedCandidateCount = batch.length;
    let candidates = validOutfitCandidates(batch, allowedIds, excludedSignatures, selected?.id);
    if (!candidates.length) {
      attemptCount = 2;
      batch = (await suggest(true)).candidates;
      generatedCandidateCount = batch.length;
      candidates = validOutfitCandidates(batch, allowedIds, excludedSignatures, selected?.id);
    }
    if (!candidates.length)
      throw conflict("There isn’t a different outfit to suggest from the available garments.");
    const { candidates: qualityPool, selectedSuitabilityTier } = qualityGateCandidates(candidates);
    if (!selectedSuitabilityTier)
      throw conflict("There isn’t a different outfit to suggest from the available garments.");
    const itemRoleById = new Map(
      items.map((item) => [item.id, item.categoryGroup ?? "other"] as const),
    );
    const eligibleItemCountByRole = items.reduce<Record<string, number>>((counts, item) => {
      const role = item.categoryGroup ?? "other";
      counts[role] = (counts[role] ?? 0) + 1;
      return counts;
    }, {});
    const selection = selectCandidateWithDiagnostics(qualityPool, recentSuggestionItemIds, {
      selectedItemId: selected?.id,
      previousItemIds,
      itemRoleById,
    });
    const result = selection.candidate;
    const suggestion = await this.repository.createSuggestion({
      ownerId,
      request: input.prompt,
      selectedItemIds: result.referencedItemIds,
      recommendation: result.recommendation,
      rationale: result.rationale,
      diagnostics: {
        version: 1,
        requestMode,
        selectedStartingItemId: selected?.id,
        attemptCount,
        generatedCandidateCount,
        validCandidateCount: candidates.length,
        selectedSuitabilityTier,
        qualityPoolSize: qualityPool.length,
        eligibleItemCountByRole,
        qualityPool: qualityPool.map((candidate) => ({
          itemIds: candidate.referencedItemIds,
          itemsByRole: itemsByRole(candidate, itemRoleById),
        })),
        variableRoles: selection.variableRoles,
        selectedNovelty: selection.novelty,
      },
    });
    return {
      ...suggestion,
      recommendation: result.recommendation,
      rationale: result.rationale,
      referencedItemIds: result.referencedItemIds,
    };
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
