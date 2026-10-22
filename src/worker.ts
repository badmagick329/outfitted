import { wardrobeService } from "@/features/wardrobe/server";
import { wardrobeReviewService } from "@/features/wardrobe-review/server";
import { hasAiAccess } from "@/features/access/server";
import { aiBudgetRepository } from "@/features/ai-budget/server";
import {
  admitFeatureRun,
  completeFeatureRunItem,
  recoverFeatureRuns,
} from "@/features/feature-grants/server";
import { notificationService } from "@/features/notifications/server";
import type { NotificationJobData } from "@/features/notifications/domain/contracts";
import {
  ANALYZE_ITEM_JOB,
  getBoss,
  REVIEW_WARDROBE_JOB,
  SEND_DISCORD_NOTIFICATION_JOB,
} from "@/lib/jobs";

const boss = await getBoss();
async function recoverAiWork() {
  const now = new Date();
  const unresolved = await aiBudgetRepository.recover(new Date(now.getTime() - 60 * 60_000), now);
  if (unresolved.length)
    console.warn(`${unresolved.length} AI liabilities await billing reconciliation.`);
  await recoverFeatureRuns(new Date(now.getTime() - 24 * 60 * 60_000));
}
await recoverAiWork();
setInterval(() => {
  void recoverAiWork().catch((error) => console.error("AI accounting recovery failed", error));
}, 60 * 60_000).unref();
await boss.work<
  { itemId: string; forceOverwrite?: boolean; featureRunId?: string },
  void,
  { includeMetadata: true; batchSize: 1 }
>(ANALYZE_ITEM_JOB, { includeMetadata: true, batchSize: 1 }, async (jobs) => {
  for (const job of jobs) {
    const runId = job.data.featureRunId;
    try {
      await wardrobeService.analyze(
        job.data.itemId,
        hasAiAccess,
        Boolean(job.data.forceOverwrite),
        runId ? () => admitFeatureRun(runId) : undefined,
      );
      if (runId) await completeFeatureRunItem(runId, job.data.itemId);
    } catch (error) {
      if (runId && job.retryCount >= job.retryLimit)
        await completeFeatureRunItem(runId, job.data.itemId);
      throw error;
    }
  }
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
await boss.work<NotificationJobData>(SEND_DISCORD_NOTIFICATION_JOB, async (jobs) => {
  for (const job of jobs) await notificationService.process(job.data);
});

console.log("Outfitted worker is listening for jobs.");
