import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { NotificationEventType } from "@/features/notifications/domain/contracts";
import type { GarmentAnalysisResult } from "@/lib/ai";
import type { VocabularyEntry } from "./metadata";
import type { StoredImage, StorageProvider } from "@/lib/storage";

export type AnalysisJobQueue = {
  enqueueAnalysis(itemId: string, options?: { forceOverwrite?: boolean }): Promise<unknown>;
};
export type NotificationQueue = {
  enqueue(event: NotificationEventType, userId: string): Promise<unknown>;
};
/**
 * Runs non-critical follow-up work after the HTTP response has been sent, so it can never
 * delay or fail the request that scheduled it.
 */
export type BackgroundScheduler = (task: () => void | Promise<void>) => void;
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
