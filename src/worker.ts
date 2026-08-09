import { wardrobeService } from "@/features/wardrobe/server";
import { hasAiAccess } from "@/features/access/server";
import { ANALYZE_ITEM_JOB, getBoss } from "@/lib/jobs";

const boss = await getBoss();
await boss.work<{ itemId: string }>(ANALYZE_ITEM_JOB, async (jobs) => {
  for (const job of jobs) await wardrobeService.analyze(job.data.itemId, hasAiAccess);
});

console.log("Outfitted AI worker is listening for jobs.");
