import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { WardrobeAnalysis } from "@/lib/ai";
import type { StoredImage, StorageProvider } from "@/lib/storage";

export type AnalysisJobQueue = { enqueueAnalysis(itemId: string): Promise<unknown> };
export type WardrobeAi = {
  readonly model?: string;
  analyze(images: string[]): Promise<AiCallResult<WardrobeAnalysis>>;
};
export type WardrobeStorage = StorageProvider;
export type ProcessedPhoto = StoredImage & { position: number; contentHash: string };
export type WardrobeAiUsageRecorder = AiUsageRecorder;
