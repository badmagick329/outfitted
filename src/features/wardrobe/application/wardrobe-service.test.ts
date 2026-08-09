import { describe, expect, it, vi } from "vitest";
import { WardrobeService } from "./wardrobe-service";
import type { WardrobeRepository } from "../domain/repository";
import type { WardrobeStorage } from "../domain/ports";

const item = {
  id: "item-1",
  userId: "user-1",
  name: "New garment",
  description: null,
  category: null,
  primaryColor: null,
  secondaryColors: [],
  material: null,
  fit: null,
  styleTags: [],
  seasons: [],
  formality: null,
  confidence: [],
  analysisStatus: "pending",
  analysisError: null,
  archivedAt: null,
  metadataEditedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function dependencies({ enqueue = vi.fn().mockResolvedValue(undefined) } = {}) {
  const repository = {
    create: vi.fn().mockResolvedValue(item),
    deleteOwned: vi.fn().mockResolvedValue(undefined),
    findOwnedPhotoByContentHash: vi.fn().mockResolvedValue(null),
  } as unknown as WardrobeRepository;
  const storage = {
    saveImage: vi.fn().mockResolvedValue({ key: "user-1/photo.webp", width: 100, height: 100 }),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as WardrobeStorage;
  const jobs = { enqueueAnalysis: enqueue };
  const ai = { analyze: vi.fn() };
  return { repository, storage, jobs, ai };
}

describe("WardrobeService.create", () => {
  it("removes stored images and the database record when queuing fails", async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error("queue unavailable"));
    const { repository, storage, jobs, ai } = dependencies({ enqueue });
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })]),
    ).rejects.toMatchObject({ status: 500 });

    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.deleteOwned).toHaveBeenCalledWith("user-1", "item-1");
    expect(storage.delete).toHaveBeenCalledWith("user-1/photo.webp");
  });

  it("returns the created garment when images and job queue succeed", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })]),
    ).resolves.toEqual(item);
    expect(jobs.enqueueAnalysis).toHaveBeenCalledWith("item-1");
  });

  it("rejects an image already stored by the same owner before processing it", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    vi.mocked(repository.findOwnedPhotoByContentHash).mockResolvedValueOnce({} as never);
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })]),
    ).rejects.toMatchObject({ status: 409 });
    expect(storage.saveImage).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
