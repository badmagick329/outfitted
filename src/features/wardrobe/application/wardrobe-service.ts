import { infrastructureFailure, notFound } from "@/shared/application-error";
import type { UpdateWardrobeItemInput } from "../domain/contracts";
import type { AnalysisJobQueue, WardrobeAi, WardrobeStorage } from "../domain/ports";
import type { WardrobeRepository } from "../domain/repository";

type Dependencies = {
  repository: WardrobeRepository;
  storage: WardrobeStorage;
  jobs: AnalysisJobQueue;
  ai: WardrobeAi;
};

export class WardrobeService {
  constructor(private readonly dependencies: Dependencies) {}

  listActiveCards(ownerId: string) {
    return this.dependencies.repository.listActiveCards(ownerId);
  }

  listActive(ownerId: string) {
    return this.dependencies.repository.listActive(ownerId);
  }

  listArchived(ownerId: string) {
    return this.dependencies.repository.listArchived(ownerId);
  }

  listInProgress(ownerId: string) {
    return this.dependencies.repository.listInProgress(ownerId);
  }

  async getOwnedItem(ownerId: string, itemId: string) {
    const item = await this.dependencies.repository.findOwned(ownerId, itemId);
    if (!item) throw notFound("Garment not found");
    return item;
  }

  findOwnedItem(ownerId: string, itemId: string) {
    return this.dependencies.repository.findOwned(ownerId, itemId);
  }

  async getOwnedPhotos(ownerId: string, itemId: string) {
    await this.getOwnedItem(ownerId, itemId);
    return this.dependencies.repository.listOwnedPhotos(ownerId, itemId);
  }

  async readOwnedPhoto(ownerId: string, photoId: string) {
    const photo = await this.dependencies.repository.findOwnedPhoto(ownerId, photoId);
    if (!photo) throw notFound("Photo not found");
    return this.dependencies.storage.read(photo.storageKey);
  }

  async create(ownerId: string, files: File[]) {
    const saved = [] as Array<{ key: string; width: number; height: number; position: number }>;
    let itemId: string | null = null;
    try {
      for (const [position, file] of files.entries()) {
        const image = await this.dependencies.storage.saveImage(
          Buffer.from(await file.arrayBuffer()),
          ownerId,
        );
        saved.push({ ...image, position });
      }
      const item = await this.dependencies.repository.create(ownerId, saved);
      itemId = item.id;
      await this.dependencies.jobs.enqueueAnalysis(item.id);
      return item;
    } catch {
      if (itemId) await this.dependencies.repository.deleteOwned(ownerId, itemId);
      await Promise.allSettled(saved.map((image) => this.dependencies.storage.delete(image.key)));
      throw infrastructureFailure(
        "We couldn’t finish saving this garment. No wardrobe record was created; please try again.",
      );
    }
  }

  async update(ownerId: string, itemId: string, values: UpdateWardrobeItemInput) {
    await this.getOwnedItem(ownerId, itemId);
    await this.dependencies.repository.updateOwned(ownerId, itemId, values);
  }

  async requestAnalysis(ownerId: string, itemId: string) {
    await this.getOwnedItem(ownerId, itemId);
    await this.dependencies.repository.setAnalysisPending(ownerId, itemId);
    try {
      await this.dependencies.jobs.enqueueAnalysis(itemId);
    } catch {
      await this.dependencies.repository.failAnalysis(
        itemId,
        "Unable to queue analysis. Please try again.",
      );
      throw infrastructureFailure("We couldn’t queue analysis. Please try again.");
    }
  }

  async delete(ownerId: string, itemId: string) {
    const photos = await this.getOwnedPhotos(ownerId, itemId);
    try {
      await Promise.all(photos.map((photo) => this.dependencies.storage.delete(photo.storageKey)));
    } catch {
      throw infrastructureFailure("We couldn’t remove the stored photos. Please try again.");
    }
    await this.dependencies.repository.deleteOwned(ownerId, itemId);
  }

  async analyze(itemId: string) {
    const item = await this.dependencies.repository.findById(itemId);
    if (!item || item.analysisStatus === "complete") return;
    try {
      await this.dependencies.repository.setAnalysisProcessing(itemId);
      const photos = await this.dependencies.repository.listPhotos(itemId);
      const images = await Promise.all(
        photos.map(
          async (photo) =>
            `data:image/webp;base64,${(await this.dependencies.storage.read(photo.storageKey)).toString("base64")}`,
        ),
      );
      const result = await this.dependencies.ai.analyze(images);
      await this.dependencies.repository.completeAnalysis(
        itemId,
        result,
        Boolean(item.metadataEditedAt),
      );
    } catch (error) {
      await this.dependencies.repository.failAnalysis(
        itemId,
        error instanceof Error ? error.message : "Analysis failed",
      );
      throw error;
    }
  }
}
