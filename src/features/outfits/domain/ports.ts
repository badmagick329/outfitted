import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { OutfitSuggestion } from "@/lib/ai";

export type OutfitAi = {
  readonly model?: string;
  suggest(prompt: string, wardrobe: unknown[]): Promise<AiCallResult<OutfitSuggestion>>;
};
export type OutfitAiUsageRecorder = AiUsageRecorder;
