import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import type { OutfitSuggestion } from "@/lib/ai";

export type OutfitAi = {
  readonly model?: string;
  suggest(
    prompt: string,
    wardrobe: unknown[],
    styleProfile?: StyleProfile | null,
  ): Promise<AiCallResult<OutfitSuggestion>>;
};
export type OutfitAiUsageRecorder = AiUsageRecorder;
export type OutfitStyleProfileReader = {
  find(userId: string): Promise<StyleProfile | null>;
};
