import { wardrobeService } from "@/features/wardrobe/server";
import { ANALYZE_ITEM_JOB, getBoss } from "@/lib/jobs";

const boss = await getBoss();
await boss.work<{ itemId: string }>(ANALYZE_ITEM_JOB, async (jobs) => {
  for (const job of jobs) await wardrobeService.analyze(job.data.itemId);
});

console.log("Outfitted AI worker is listening for jobs.");
