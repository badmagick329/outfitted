import { trackAiCall } from "@/features/ai-usage/application/track-ai-call";
import { conflict, infrastructureFailure } from "@/shared/application-error";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import type {
  WardrobeReviewEntry,
  WardrobeReviewReport,
  WardrobeReviewSourceItem,
  WardrobeReviewView,
} from "../domain/contracts";
import type {
  WardrobeReviewAi,
  WardrobeReviewJobQueue,
  WardrobeReviewSourceReader,
  WardrobeReviewStyleProfileReader,
  WardrobeReviewUsageRecorder,
} from "../domain/ports";
import type { WardrobeReviewRecord, WardrobeReviewRepository } from "../domain/repository";
import { referencedReviewItemIds, wardrobeReviewSnapshotSignature } from "../domain/snapshot";

type Dependencies = {
  repository: WardrobeReviewRepository;
  source: WardrobeReviewSourceReader;
  styleProfiles: WardrobeReviewStyleProfileReader;
  jobs: WardrobeReviewJobQueue;
  ai: WardrobeReviewAi;
  usageRecorder?: WardrobeReviewUsageRecorder;
};

function snapshot(items: WardrobeReviewSourceItem[], styleProfile: StyleProfile | null) {
  return {
    sourceSignature: wardrobeReviewSnapshotSignature(items, styleProfile),
    itemCount: items.length,
    usedStyleProfile: Boolean(styleProfile),
  };
}

function sanitizeEntries(entries: WardrobeReviewEntry[], allowedIds: Set<string>) {
  return entries.map((entry) => ({
    ...entry,
    itemIds: [...new Set(entry.itemIds.filter((id) => allowedIds.has(id)))],
  }));
}

function sanitizeReport(report: WardrobeReviewReport, items: WardrobeReviewSourceItem[]) {
  const allowedIds = new Set(items.map((item) => item.id));
  return {
    ...report,
    strengths: sanitizeEntries(report.strengths, allowedIds),
    gaps: sanitizeEntries(report.gaps, allowedIds),
    observations: sanitizeEntries(report.observations, allowedIds),
  };
}

function toView(
  review: WardrobeReviewRecord | null,
  items: WardrobeReviewSourceItem[],
  styleProfile: StyleProfile | null,
): WardrobeReviewView {
  if (!review)
    return {
      currentItemCount: items.length,
      currentHasStyleProfile: Boolean(styleProfile),
      review: null,
    };

  const itemById = new Map(items.map((item) => [item.id, item]));
  const referencedItems = review.report
    ? referencedReviewItemIds(review.report)
        .map((id) => itemById.get(id))
        .filter((item): item is WardrobeReviewSourceItem => Boolean(item))
        .map((item) => ({
          id: item.id,
          name: item.name || item.category || "Garment",
          category: item.category,
          coverPhotoId: item.coverPhotoId,
        }))
    : [];

  return {
    currentItemCount: items.length,
    currentHasStyleProfile: Boolean(styleProfile),
    review: {
      id: review.id,
      status: review.status,
      report: review.report,
      reviewedItemCount: review.itemCount,
      usedStyleProfile: review.usedStyleProfile,
      isStale:
        review.status === "complete" &&
        review.sourceSignature !== wardrobeReviewSnapshotSignature(items, styleProfile),
      error: review.error,
      createdAt: review.createdAt.toISOString(),
      completedAt: review.completedAt?.toISOString() ?? null,
      referencedItems,
    },
  };
}

export class WardrobeReviewService {
  constructor(private readonly dependencies: Dependencies) {}

  private async source(ownerId: string) {
    return Promise.all([
      this.dependencies.source.listActive(ownerId),
      this.dependencies.styleProfiles.find(ownerId),
    ]);
  }

  async getView(ownerId: string) {
    const [[items, styleProfile], review] = await Promise.all([
      this.source(ownerId),
      this.dependencies.repository.findLatestOwned(ownerId),
    ]);
    return toView(review, items, styleProfile);
  }

  async request(ownerId: string) {
    const [items, styleProfile] = await this.source(ownerId);
    if (!items.length) throw conflict("Add at least one garment before reviewing your wardrobe.");
    const { review, created } = await this.dependencies.repository.createPending(
      ownerId,
      snapshot(items, styleProfile),
    );
    if (created) {
      try {
        await this.dependencies.jobs.enqueue(review.id);
      } catch {
        await this.dependencies.repository.fail(
          review.id,
          "We couldn’t start this review. Please try again.",
        );
        throw infrastructureFailure("We couldn’t start this review. Please try again.");
      }
    }
    return toView(review, items, styleProfile);
  }

  async process(reviewId: string, canUseAi: (ownerId: string) => Promise<boolean>) {
    const review = await this.dependencies.repository.findById(reviewId);
    if (!review || review.status === "complete") return;
    if (!(await canUseAi(review.userId))) {
      await this.dependencies.repository.fail(
        review.id,
        "AI features are no longer enabled for this account.",
      );
      return;
    }

    const [items, styleProfile] = await this.source(review.userId);
    if (!items.length) {
      await this.dependencies.repository.fail(review.id, "There are no active garments to review.");
      return;
    }
    await this.dependencies.repository.setProcessing(review.id, snapshot(items, styleProfile));

    try {
      const report = await trackAiCall({
        recorder: this.dependencies.usageRecorder,
        userId: review.userId,
        operation: "wardrobe_review",
        model: this.dependencies.ai.model ?? "unknown",
        call: () => this.dependencies.ai.review(items, styleProfile),
      });
      await this.dependencies.repository.complete(review.id, sanitizeReport(report, items));
    } catch (error) {
      console.error("Wardrobe review failed", error);
      throw error;
    }
  }

  fail(reviewId: string) {
    return this.dependencies.repository.fail(
      reviewId,
      "We couldn’t complete this review. Please try again.",
    );
  }
}
