import { wardrobeService } from "@/features/wardrobe/server";
import { wardrobeReviewService } from "@/features/wardrobe-review/server";
import { hasAiAccess } from "@/features/access/server";
import { ANALYZE_ITEM_JOB, getBoss, REVIEW_WARDROBE_JOB } from "@/lib/jobs";

const boss = await getBoss();
await boss.work<{ itemId: string; forceOverwrite?: boolean }>(ANALYZE_ITEM_JOB, async (jobs) => {
  for (const job of jobs)
    await wardrobeService.analyze(job.data.itemId, hasAiAccess, Boolean(job.data.forceOverwrite));
});
await boss.work<{ reviewId: string }, void, { includeMetadata: true; batchSize: 1 }>(
  REVIEW_WARDROBE_JOB,
  { includeMetadata: true, batchSize: 1 },
  async (jobs) => {
    for (const job of jobs) {
      try {
        await wardrobeReviewService.process(job.data.reviewId, hasAiAccess);
      } catch (error) {
        if (job.retryCount >= job.retryLimit) await wardrobeReviewService.fail(job.data.reviewId);
        throw error;
      }
    }
  },
);

console.log("Outfitted worker is listening for jobs.");
