import { PgBoss } from "pg-boss";

export const ANALYZE_ITEM_JOB = "analyze-wardrobe-item";
let boss: PgBoss | undefined;
export async function getBoss() {
  if (!boss) {
    boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });
    await boss.start();
    await boss.createQueue(ANALYZE_ITEM_JOB);
  }
  return boss;
}
export async function enqueueAnalysis(itemId: string) {
  return (await getBoss()).send(ANALYZE_ITEM_JOB, { itemId }, { retryLimit: 3, retryDelay: 30 });
}
