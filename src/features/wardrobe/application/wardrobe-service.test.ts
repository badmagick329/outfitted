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

function dependencies({
  enqueue = vi.fn().mockResolvedValue(undefined),
  notify = vi.fn().mockResolvedValue(undefined),
  claimFirstGarmentMilestone = vi.fn().mockResolvedValue(true),
  schedule = vi.fn(),
} = {}) {
  const repository = {
    create: vi.fn().mockResolvedValue(item),
    deleteOwned: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findOwnedPhotoByContentHash: vi.fn().mockResolvedValue(null),
    setAnalysisNotRequested: vi.fn().mockResolvedValue(undefined),
    listActive: vi.fn().mockResolvedValue([]),
    reserveAnalysis: vi.fn().mockResolvedValue(true),
    failAnalysis: vi.fn().mockResolvedValue(undefined),
    claimFirstGarmentMilestone,
  } as unknown as WardrobeRepository;
  const storage = {
    saveImage: vi.fn().mockResolvedValue({ key: "user-1/photo.webp", width: 100, height: 100 }),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as WardrobeStorage;
  const jobs = { enqueueAnalysis: enqueue };
  const notifications = { enqueue: notify };
  const ai = { analyze: vi.fn() };
  return { repository, storage, jobs, notifications, schedule, ai };
}

describe("WardrobeService.create", () => {
  it("removes stored images and the database record when queuing fails", async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error("queue unavailable"));
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies({ enqueue });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })], true),
    ).rejects.toMatchObject({ status: 500 });

    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.deleteOwned).toHaveBeenCalledWith("user-1", "item-1");
    expect(storage.delete).toHaveBeenCalledWith("user-1/photo.webp");
  });

  it("returns the created garment when images and job queue succeed", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })], true),
    ).resolves.toEqual(item);
    expect(jobs.enqueueAnalysis).toHaveBeenCalledWith("item-1");
  });

  it("rejects an image already stored by the same owner before processing it", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
    vi.mocked(repository.findOwnedPhotoByContentHash).mockResolvedValueOnce({} as never);
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(
      service.create("user-1", [new File(["image"], "top.webp", { type: "image/webp" })], true),
    ).rejects.toMatchObject({ status: 409 });
    expect(storage.saveImage).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates an inventory-only garment without queuing AI analysis", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await service.create(
      "user-1",
      [new File(["image"], "top.webp", { type: "image/webp" })],
      false,
    );

    expect(repository.create).toHaveBeenCalledWith("user-1", expect.any(Array), "not_requested");
    expect(jobs.enqueueAnalysis).not.toHaveBeenCalled();
  });

  it("does not invoke AI when access has been revoked before a job starts", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
    vi.mocked(repository.findById).mockResolvedValue(item as never);
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await service.analyze("item-1", async () => false);

    expect(repository.setAnalysisNotRequested).toHaveBeenCalledWith("item-1");
    expect(ai.analyze).not.toHaveBeenCalled();
  });
});

describe("WardrobeService first-garment milestone", () => {
  const photo = () => new File(["image"], "top.webp", { type: "image/webp" });

  function deferredScheduler() {
    const tasks: Array<() => void | Promise<void>> = [];
    const schedule = vi.fn((task: () => void | Promise<void>) => {
      tasks.push(task);
    });
    const run = () => Promise.all(tasks.map((task) => task()));
    return { schedule, run, tasks };
  }

  it("returns before the deferred milestone and notification work settles", async () => {
    const { schedule, run, tasks } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({ schedule });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(service.create("user-1", [photo()], true)).resolves.toEqual(item);

    expect(tasks).toHaveLength(1);
    expect(repository.claimFirstGarmentMilestone).not.toHaveBeenCalled();
    expect(notifications.enqueue).not.toHaveBeenCalled();

    await run();

    expect(repository.claimFirstGarmentMilestone).toHaveBeenCalledWith("user-1");
    expect(notifications.enqueue).toHaveBeenCalledTimes(1);
    expect(notifications.enqueue).toHaveBeenCalledWith("first_garment_added", "user-1");
  });

  it("claims the milestone for inventory-only uploads without queuing analysis", async () => {
    const { schedule, run } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({ schedule });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await service.create("user-1", [photo()], false);
    await run();

    expect(jobs.enqueueAnalysis).not.toHaveBeenCalled();
    expect(repository.claimFirstGarmentMilestone).toHaveBeenCalledWith("user-1");
    expect(notifications.enqueue).toHaveBeenCalledWith("first_garment_added", "user-1");
  });

  it("does not notify when another upload already claimed the milestone", async () => {
    const { schedule, run } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({
      claimFirstGarmentMilestone: vi.fn().mockResolvedValue(false),
      schedule,
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await service.create("user-1", [photo()], true);
    await run();

    expect(notifications.enqueue).not.toHaveBeenCalled();
  });

  it("allows only one winner when concurrent first uploads race", async () => {
    const claimFirstGarmentMilestone = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { schedule, run } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({
      claimFirstGarmentMilestone,
      schedule,
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await Promise.all([
      service.create("user-1", [photo()], true),
      service.create("user-1", [photo()], true),
    ]);
    await run();

    expect(claimFirstGarmentMilestone).toHaveBeenCalledTimes(2);
    expect(notifications.enqueue).toHaveBeenCalledTimes(1);
  });

  it("keeps the garment and contains errors when claiming the milestone fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { schedule, run } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({
      claimFirstGarmentMilestone: vi.fn().mockRejectedValue(new Error("database unavailable")),
      schedule,
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(service.create("user-1", [photo()], true)).resolves.toEqual(item);
    await expect(run()).resolves.toBeDefined();

    expect(repository.deleteOwned).not.toHaveBeenCalled();
    expect(notifications.enqueue).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the garment and contains errors when the notification cannot be enqueued", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { schedule, run } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({
      notify: vi.fn().mockRejectedValue(new Error("queue unavailable")),
      schedule,
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(service.create("user-1", [photo()], true)).resolves.toEqual(item);
    await expect(run()).resolves.toBeDefined();

    expect(repository.deleteOwned).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not schedule the milestone when the analysis job cannot be queued", async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error("queue unavailable"));
    const { schedule, tasks } = deferredScheduler();
    const { repository, storage, jobs, notifications, ai } = dependencies({ enqueue, schedule });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(service.create("user-1", [photo()], true)).rejects.toMatchObject({ status: 500 });

    expect(tasks).toHaveLength(0);
    expect(repository.claimFirstGarmentMilestone).not.toHaveBeenCalled();
    expect(notifications.enqueue).not.toHaveBeenCalled();
  });
});

describe("WardrobeService.analyze", () => {
  it("supplies existing tags and normalizes analysis metadata before persistence", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
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
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

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

  it("passes forced re-analysis through to metadata replacement", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
    Object.assign(repository, {
      findById: vi.fn().mockResolvedValue({ ...item, metadataEditedAt: new Date() }),
      setAnalysisProcessing: vi.fn().mockResolvedValue(undefined),
      listPhotos: vi.fn().mockResolvedValue([{ storageKey: "user-1/photo.webp" }]),
      listActive: vi.fn().mockResolvedValue([]),
      completeAnalysis: vi.fn().mockResolvedValue(undefined),
      failAnalysis: vi.fn().mockResolvedValue(undefined),
    });
    Object.assign(storage, { read: vi.fn().mockResolvedValue(Buffer.from("image")) });
    Object.assign(ai, {
      analyze: vi.fn().mockResolvedValue({
        data: {
          name: "Replacement name",
          description: "Replacement description",
          category: "T-shirt",
          primaryColor: "Blue",
          secondaryColors: [],
          material: "Cotton",
          fit: "Regular",
          styleTags: [],
          seasons: [],
          formality: "Casual",
          confidence: [],
        },
        model: "test",
        providerRequestId: "request",
        usage: { inputTokens: 1, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 1 },
      }),
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await service.analyze("item-1", async () => true, true);

    expect(repository.completeAnalysis).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ name: "Replacement name" }),
      true,
    );
  });
});

describe("WardrobeService.queueBulkReanalysis", () => {
  it("queues eligible active garments once and skips work already in progress", async () => {
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies();
    Object.assign(repository, {
      listActive: vi.fn().mockResolvedValue([
        { ...item, id: "ready", analysisStatus: "complete" },
        { ...item, id: "pending", analysisStatus: "pending" },
        { ...item, id: "processing", analysisStatus: "processing" },
      ]),
      reserveAnalysis: vi.fn().mockResolvedValue(true),
      failAnalysis: vi.fn().mockResolvedValue(undefined),
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(service.queueBulkReanalysis("user-1")).resolves.toEqual({
      queued: 1,
      skipped: 2,
      failed: 0,
    });
    expect(repository.reserveAnalysis).toHaveBeenCalledWith("user-1", "ready");
    expect(jobs.enqueueAnalysis).toHaveBeenCalledWith("ready", { forceOverwrite: true });
  });

  it("marks items failed when their re-analysis job cannot be queued", async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error("queue unavailable"));
    const { repository, storage, jobs, notifications, schedule, ai } = dependencies({ enqueue });
    Object.assign(repository, {
      listActive: vi.fn().mockResolvedValue([{ ...item, id: "ready", analysisStatus: "complete" }]),
      reserveAnalysis: vi.fn().mockResolvedValue(true),
      failAnalysis: vi.fn().mockResolvedValue(undefined),
    });
    const service = new WardrobeService({ repository, storage, jobs, notifications, schedule, ai });

    await expect(service.queueBulkReanalysis("user-1")).resolves.toEqual({
      queued: 0,
      skipped: 0,
      failed: 1,
    });
    expect(repository.failAnalysis).toHaveBeenCalledWith(
      "ready",
      "Unable to queue re-analysis. Please try again.",
    );
  });
});
