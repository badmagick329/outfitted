import type { WardrobeAnalysis } from "@/lib/ai";
import type { itemPhotos, wardrobeItems } from "@/lib/db/schema";
import type { ProcessedPhoto } from "./ports";
import type { UpdateWardrobeItemInput } from "./contracts";

export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type WardrobePhoto = typeof itemPhotos.$inferSelect;
export type WardrobeCard = WardrobeItem & { coverPhotoId: string | null; photoCount: number };
export type AnalysisStatus = { id: string; status: string; updatedAt: Date };

export interface WardrobeRepository {
  create(
    ownerId: string,
    photos: ProcessedPhoto[],
    analysisStatus: "pending" | "not_requested",
  ): Promise<WardrobeItem>;
  findOwned(ownerId: string, itemId: string): Promise<WardrobeItem | null>;
  findById(itemId: string): Promise<WardrobeItem | null>;
  listActive(ownerId: string): Promise<WardrobeItem[]>;
  listActiveCards(ownerId: string): Promise<WardrobeCard[]>;
  listArchivedCards(ownerId: string): Promise<WardrobeCard[]>;
  listOwnedPhotos(ownerId: string, itemId: string): Promise<WardrobePhoto[]>;
  findOwnedPhoto(ownerId: string, photoId: string): Promise<WardrobePhoto | null>;
  findOwnedPhotoByContentHash(ownerId: string, contentHash: string): Promise<WardrobePhoto | null>;
  listPhotos(itemId: string): Promise<WardrobePhoto[]>;
  addPhotos(ownerId: string, itemId: string, photos: ProcessedPhoto[]): Promise<WardrobePhoto[]>;
  replacePhoto(ownerId: string, photoId: string, photo: ProcessedPhoto): Promise<WardrobePhoto[]>;
  removePhoto(
    ownerId: string,
    photoId: string,
  ): Promise<{ removed: WardrobePhoto; photos: WardrobePhoto[] }>;
  setMainPhoto(ownerId: string, photoId: string): Promise<WardrobePhoto[]>;
  listInProgress(ownerId: string): Promise<AnalysisStatus[]>;
  updateOwned(ownerId: string, itemId: string, values: UpdateWardrobeItemInput): Promise<void>;
  setAnalysisPending(ownerId: string, itemId: string): Promise<void>;
  reserveAnalysis(ownerId: string, itemId: string): Promise<boolean>;
  setAnalysisNotRequested(itemId: string): Promise<void>;
  setAnalysisProcessing(itemId: string): Promise<void>;
  completeAnalysis(
    itemId: string,
    result: WardrobeAnalysis,
    forceOverwrite: boolean,
  ): Promise<void>;
  failAnalysis(itemId: string, message: string): Promise<void>;
  deleteOwned(ownerId: string, itemId: string): Promise<void>;
}
