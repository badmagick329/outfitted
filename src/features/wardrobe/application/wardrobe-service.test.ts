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
  categoryGroup: null,
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
    findById: vi.fn().mockResolvedValue(null),
    findOwnedPhotoByContentHash: vi.fn().mockResolvedValue(null),
    setAnalysisNotRequested: vi.fn().mockResolvedValue(undefined),
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
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })], true),
    ).rejects.toMatchObject({ status: 500 });

    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.deleteOwned).toHaveBeenCalledWith("user-1", "item-1");
    expect(storage.delete).toHaveBeenCalledWith("user-1/photo.webp");
  });

  it("returns the created garment when images and job queue succeed", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })], true),
    ).resolves.toEqual(item);
    expect(jobs.enqueueAnalysis).toHaveBeenCalledWith("item-1");
  });

  it("rejects an image already stored by the same owner before processing it", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    vi.mocked(repository.findOwnedPhotoByContentHash).mockResolvedValueOnce({} as never);
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })], true),
    ).rejects.toMatchObject({ status: 409 });
    expect(storage.saveImage).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates an inventory-only garment without queuing AI analysis", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await service.create(
      "user-1",
      [new File(["image"], "top.webp", { type: "image/webp" })],
      false,
    );

    expect(repository.create).toHaveBeenCalledWith("user-1", expect.any(Array), "not_requested");
    expect(jobs.enqueueAnalysis).not.toHaveBeenCalled();
  });

  it("does not invoke AI when access has been revoked before a job starts", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    vi.mocked(repository.findById).mockResolvedValue(item as never);
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await service.analyze("item-1", async () => false);

    expect(repository.setAnalysisNotRequested).toHaveBeenCalledWith("item-1");
    expect(ai.analyze).not.toHaveBeenCalled();
  });
});

describe("WardrobeService.analyze", () => {
  it("supplies existing tags and normalizes analysis metadata before persistence", async () => {
    const { repository, storage, jobs, ai } = dependencies();
    Object.assign(repository, {
      findById: vi.fn().mockResolvedValue(item),
      setAnalysisProcessing: vi.fn().mockResolvedValue(undefined),
      listPhotos: vi.fn().mockResolvedValue([{ storageKey: "user-1/photo.webp" }]),
      listActive: vi.fn().mockResolvedValue([{ ...item, styleTags: ["Minimalist"] }]),
      completeAnalysis: vi.fn().mockResolvedValue(undefined),
      failAnalysis: vi.fn().mockResolvedValue(undefined),
    });
    Object.assign(storage, { read: vi.fn().mockResolvedValue(Buffer.from("image")) });
    Object.assign(ai, {
      analyze: vi.fn().mockResolvedValue({
        data: {
          name: "  Blue   tee ",
          description: "  Soft   cotton ",
          category: "T-shirt",
          primaryColor: " Blue ",
          secondaryColors: ["Navy", " navy "],
          material: " Cotton ",
          fit: " Regular ",
          styleTags: ["minimalist", " Casual ", "casual"],
          seasons: ["Summer", " summer "],
          formality: "Casual",
          confidence: [],
        },
        model: "test",
        providerRequestId: "request",
        usage: { inputTokens: 1, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 1 },
      }),
    });
    const service = new WardrobeService({ repository, storage, jobs, ai });

    await service.analyze("item-1", async () => true);

    expect(ai.analyze).toHaveBeenCalledWith(expect.any(Array), {
      existingStyleTags: [{ value: "Minimalist", count: 1 }],
    });
    expect(repository.completeAnalysis).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({
        name: "Blue tee",
        categoryGroup: "tops",
        styleTags: ["Minimalist", "Casual"],
        secondaryColors: ["Navy"],
        seasons: ["Summer"],
      }),
      false,
    );
  });
});
