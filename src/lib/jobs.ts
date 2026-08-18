import { PgBoss } from "pg-boss";

export const ANALYZE_ITEM_JOB = "analyze-wardrobe-item";
export const REVIEW_WARDROBE_JOB = "review-wardrobe";
let boss: PgBoss | undefined;
export async function getBoss() {
  if (!boss) {
    boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });
    await boss.start();
    await boss.createQueue(ANALYZE_ITEM_JOB);
    await boss.createQueue(REVIEW_WARDROBE_JOB);
  }
  return boss;
}
export async function enqueueAnalysis(itemId: string, options: { forceOverwrite?: boolean } = {}) {
  return (await getBoss()).send(
    ANALYZE_ITEM_JOB,
    { itemId, forceOverwrite: Boolean(options.forceOverwrite) },
    { retryLimit: 3, retryDelay: 30, singletonKey: itemId },
  );
}
export async function enqueueWardrobeReview(reviewId: string) {
  return (await getBoss()).send(
    REVIEW_WARDROBE_JOB,
    { reviewId },
    { retryLimit: 3, retryDelay: 30 },
  );
}
