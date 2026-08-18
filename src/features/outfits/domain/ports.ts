import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import type { OutfitSuggestionBatch } from "@/lib/ai";

export type OutfitAi = {
  readonly model?: string;
  suggest(
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
    excludedOutfitItemIds?: string[][],
  ): Promise<AiCallResult<OutfitSuggestionBatch>>;
};
export type OutfitAiUsageRecorder = AiUsageRecorder;
export type OutfitStyleProfileReader = {
  find(userId: string): Promise<StyleProfile | null>;
};
