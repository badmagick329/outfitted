import type { WardrobeAnalysis } from "@/lib/ai";
import type { StoredImage, StorageProvider } from "@/lib/storage";

export type AnalysisJobQueue = { enqueueAnalysis(itemId: string): Promise<unknown> };
export type WardrobeAi = { analyze(images: string[]): Promise<WardrobeAnalysis> };
export type WardrobeStorage = StorageProvider;
export type ProcessedPhoto = StoredImage & { position: number };
