import { eq } from "drizzle-orm";
import { ai } from "@/lib/ai";
import { db } from "@/lib/db";
import { itemPhotos, wardrobeItems } from "@/lib/db/schema";
import { ANALYZE_ITEM_JOB, getBoss } from "@/lib/jobs";
import { storage } from "@/lib/storage";

const boss = await getBoss();
await boss.work<{ itemId: string }>(ANALYZE_ITEM_JOB, async (jobs) => {
  for (const job of jobs) await analyzeItem(job.data.itemId);
});

async function analyzeItem(itemId: string) {
  try {
    const [item] = await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.id, itemId))
      .limit(1);
    if (!item || item.analysisStatus === "complete") return;
    await db
      .update(wardrobeItems)
      .set({ analysisStatus: "processing", analysisError: null, updatedAt: new Date() })
      .where(eq(wardrobeItems.id, itemId));
    const photos = await db.select().from(itemPhotos).where(eq(itemPhotos.itemId, itemId));
    const images = await Promise.all(
      photos.map(
        async (photo) =>
          `data:image/webp;base64,${(await storage.read(photo.storageKey)).toString("base64")}`,
      ),
    );
    const result = await ai.analyze(images);
    const values = item.metadataEditedAt
      ? { analysisStatus: "complete", analysisError: null, updatedAt: new Date() }
      : {
          ...result,
          name: item.name === "New garment" ? result.name : item.name,
          material: result.material ?? null,
          fit: result.fit ?? null,
          analysisStatus: "complete",
          analysisError: null,
          updatedAt: new Date(),
        };
    await db.update(wardrobeItems).set(values).where(eq(wardrobeItems.id, itemId));
  } catch (error) {
    await db
      .update(wardrobeItems)
      .set({
        analysisStatus: "failed",
        analysisError: error instanceof Error ? error.message.slice(0, 1000) : "Analysis failed",
        updatedAt: new Date(),
      })
      .where(eq(wardrobeItems.id, itemId));
    throw error;
  }
}
console.log("Outfitted AI worker is listening for jobs.");
