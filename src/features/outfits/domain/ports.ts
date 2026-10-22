import type { AiCallResult } from "@/features/ai-usage/domain/contracts";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import type { AiCallContext, OutfitSuggestionBatch } from "@/lib/ai";

export type OutfitAi = {
  readonly model?: string;
  suggest(
    actor: AiCallContext,
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
    excludedOutfitItemIds?: string[][],
  ): Promise<AiCallResult<OutfitSuggestionBatch>>;
};
export type OutfitStyleProfileReader = {
  find(userId: string): Promise<StyleProfile | null>;
};
