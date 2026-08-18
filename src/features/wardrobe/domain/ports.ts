import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { GarmentAnalysisResult } from "@/lib/ai";
import type { VocabularyEntry } from "./metadata";
import type { StoredImage, StorageProvider } from "@/lib/storage";

export type AnalysisJobQueue = {
  enqueueAnalysis(itemId: string, options?: { forceOverwrite?: boolean }): Promise<unknown>;
};
export type WardrobeAi = {
  readonly model?: string;
  analyze(
    images: string[],
    context: { existingStyleTags: VocabularyEntry[] },
  ): Promise<AiCallResult<GarmentAnalysisResult>>;
};
export type WardrobeStorage = StorageProvider;
export type ProcessedPhoto = StoredImage & { position: number; contentHash: string };
export type WardrobeAiUsageRecorder = AiUsageRecorder;
