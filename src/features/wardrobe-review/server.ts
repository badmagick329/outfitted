import { ai } from "@/lib/ai";
import { enqueueWardrobeReview } from "@/lib/jobs";
import { aiUsageRecorder } from "@/features/ai-usage/server";
import { styleProfileReader } from "@/features/style-profile/server";
import { wardrobeService } from "@/features/wardrobe/server";
import { WardrobeReviewService } from "./application/wardrobe-review-service";
import { DrizzleWardrobeReviewRepository } from "./infrastructure/drizzle-wardrobe-review-repository";

export const wardrobeReviewService = new WardrobeReviewService({
  repository: new DrizzleWardrobeReviewRepository(),
  source: { listActive: (ownerId) => wardrobeService.listActiveCards(ownerId) },
  styleProfiles: styleProfileReader,
  jobs: { enqueue: enqueueWardrobeReview },
  ai,
  usageRecorder: aiUsageRecorder,
});
