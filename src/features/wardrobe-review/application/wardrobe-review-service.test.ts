import { describe, expect, it, vi } from "vitest";
import { WardrobeReviewService } from "./wardrobe-review-service";
import type { WardrobeReviewSourceItem } from "../domain/contracts";
import type { WardrobeReviewRecord, WardrobeReviewRepository } from "../domain/repository";
import { wardrobeReviewSnapshotSignature } from "../domain/snapshot";

const item = {
  id: "7c1bcc30-61e7-4b82-bb99-bd73f33d926d",
  name: "Teal shirt",
  description: null,
  category: "shirt",
  categoryGroup: "tops",
  primaryColor: "teal",
  secondaryColors: [],
  material: null,
  fit: null,
  styleTags: [],
  seasons: [],
  formality: null,
  analysisStatus: "complete",
  updatedAt: new Date("2026-08-11T10:00:00Z"),
  coverPhotoId: "9e367c22-490a-4159-b654-0b118b69b579",
} satisfies WardrobeReviewSourceItem;

const review = {
  id: "0cf74d01-a251-4ef8-a573-cf7d308e8c38",
  userId: "user-1",
  status: "pending",
  report: null,
  sourceSignature: "signature",
  itemCount: 1,
  usedStyleProfile: false,
  error: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-08-11T10:00:00Z"),
  updatedAt: new Date("2026-08-11T10:00:00Z"),
} satisfies WardrobeReviewRecord;

function aiResult<T>(data: T) {
  return {
    data,
    model: "test-model",
    providerRequestId: "response-1",
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheWriteInputTokens: 0,
      outputTokens: 30,
    },
  };
}

function dependencies({ items = [item], profile = null as null | Record<string, string> } = {}) {
  const repository = {
    createPending: vi.fn().mockResolvedValue({ review, created: true }),
    findLatestOwned: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(review),
    setProcessing: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  } as unknown as WardrobeReviewRepository;
  const source = { listActive: vi.fn().mockResolvedValue(items) };
  const styleProfiles = { find: vi.fn().mockResolvedValue(profile) };
  const jobs = { enqueue: vi.fn().mockResolvedValue("job-1") };
  const ai = { model: "test-model", review: vi.fn() };
  return { repository, source, styleProfiles, jobs, ai };
}

describe("WardrobeReviewService", () => {
  it("does not create a review for an empty wardrobe", async () => {
    const deps = dependencies({ items: [] });
    const service = new WardrobeReviewService(deps);

    await expect(service.request("user-1")).rejects.toMatchObject({ status: 409 });
    expect(deps.repository.createPending).not.toHaveBeenCalled();
  });

  it("returns an existing active review without queuing a duplicate job", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.createPending).mockResolvedValue({ review, created: false });
    const service = new WardrobeReviewService(deps);

    await service.request("user-1");

    expect(deps.jobs.enqueue).not.toHaveBeenCalled();
  });

  it("marks a new review failed when it cannot be queued", async () => {
    const deps = dependencies();
    deps.jobs.enqueue.mockRejectedValueOnce(new Error("queue unavailable"));
    const service = new WardrobeReviewService(deps);

    await expect(service.request("user-1")).rejects.toMatchObject({ status: 500 });
    expect(deps.repository.fail).toHaveBeenCalledWith(
      review.id,
      "We couldn’t start this review. Please try again.",
    );
  });

  it("rechecks AI access before processing", async () => {
    const deps = dependencies();
    const service = new WardrobeReviewService(deps);

    await service.process(review.id, async () => false);

    expect(deps.repository.fail).toHaveBeenCalledWith(
      review.id,
      "AI features are no longer enabled for this account.",
    );
    expect(deps.ai.review).not.toHaveBeenCalled();
  });

  it("uses the style profile and removes AI references outside the active wardrobe", async () => {
    const profile = {
      generalStyle: "Relaxed tailoring",
      preferences: "Roomy shirts",
      avoidances: "Very slim fits",
      occasionNotes: "",
    };
    const deps = dependencies({ profile });
    deps.ai.review.mockResolvedValueOnce(
      aiResult({
        summary: "A compact casual wardrobe.",
        strengths: [
          {
            title: "Casual shirts",
            detail: "The teal shirt covers relaxed occasions.",
            itemIds: [item.id, "8b30a7fa-b808-4e1e-a125-9238b134f61d"],
          },
        ],
        gaps: [],
        observations: [],
      }),
    );
    const service = new WardrobeReviewService(deps);

    await service.process(review.id, async () => true);

    expect(deps.ai.review).toHaveBeenCalledWith([item], profile);
    expect(deps.repository.complete).toHaveBeenCalledWith(
      review.id,
      expect.objectContaining({
        strengths: [expect.objectContaining({ itemIds: [item.id] })],
      }),
    );
  });

  it("marks a saved report stale when the wardrobe has changed", async () => {
    const report = {
      summary: "A compact casual wardrobe.",
      strengths: [
        {
          title: "Casual shirts",
          detail: "The teal shirt covers relaxed occasions.",
          itemIds: [item.id],
        },
      ],
      gaps: [],
      observations: [],
    };
    const deps = dependencies({
      items: [{ ...item, updatedAt: new Date("2026-08-12T10:00:00Z") }],
    });
    vi.mocked(deps.repository.findLatestOwned).mockResolvedValue({
      ...review,
      status: "complete",
      report,
      sourceSignature: wardrobeReviewSnapshotSignature([item], null),
      completedAt: new Date("2026-08-11T10:01:00Z"),
    });
    const service = new WardrobeReviewService(deps);

    await expect(service.getView("user-1")).resolves.toMatchObject({
      review: {
        isStale: true,
        referencedItems: [{ id: item.id, name: item.name }],
      },
    });
  });
});
