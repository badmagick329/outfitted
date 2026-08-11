import type {
  WardrobeReviewReport,
  WardrobeReviewStatus,
} from "@/features/wardrobe-review/domain/contracts";

export type WardrobeReviewRecord = {
  id: string;
  userId: string;
  status: WardrobeReviewStatus;
  report: WardrobeReviewReport | null;
  sourceSignature: string;
  itemCount: number;
  usedStyleProfile: boolean;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewSnapshot = {
  sourceSignature: string;
  itemCount: number;
  usedStyleProfile: boolean;
};

export interface WardrobeReviewRepository {
  createPending(
    ownerId: string,
    snapshot: ReviewSnapshot,
  ): Promise<{ review: WardrobeReviewRecord; created: boolean }>;
  findLatestOwned(ownerId: string): Promise<WardrobeReviewRecord | null>;
  findById(reviewId: string): Promise<WardrobeReviewRecord | null>;
  setProcessing(reviewId: string, snapshot: ReviewSnapshot): Promise<void>;
  complete(reviewId: string, report: WardrobeReviewReport): Promise<void>;
  fail(reviewId: string, message: string): Promise<void>;
}
