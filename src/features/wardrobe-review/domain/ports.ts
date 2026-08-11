import type { AiCallResult, AiUsageRecorder } from "@/features/ai-usage/domain/contracts";
import type { StyleProfile } from "@/features/style-profile/domain/contracts";
import type {
  WardrobeReviewReport,
  WardrobeReviewSourceItem,
} from "@/features/wardrobe-review/domain/contracts";

export type WardrobeReviewAi = {
  readonly model?: string;
  review(
    wardrobe: WardrobeReviewSourceItem[],
    styleProfile?: StyleProfile | null,
  ): Promise<AiCallResult<WardrobeReviewReport>>;
};

export type WardrobeReviewSourceReader = {
  listActive(ownerId: string): Promise<WardrobeReviewSourceItem[]>;
};

export type WardrobeReviewStyleProfileReader = {
  find(ownerId: string): Promise<StyleProfile | null>;
};

export type WardrobeReviewJobQueue = {
  enqueue(reviewId: string): Promise<unknown>;
};

export type WardrobeReviewUsageRecorder = AiUsageRecorder;
