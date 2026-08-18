import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wardrobeItems } from "@/lib/db/schema";
import { normalizeExistingWardrobeMetadata } from "@/features/wardrobe/domain/metadata-maintenance";

const apply = process.argv.includes("--apply");
const items = await db.select().from(wardrobeItems).orderBy(wardrobeItems.userId, wardrobeItems.createdAt);
const normalized = normalizeExistingWardrobeMetadata(items);
const changed = normalized.filter((item, index) => JSON.stringify(item) !== JSON.stringify(items[index]));
if (!apply) {
  console.log(`${changed.length} garments would be cleaned. Run with --apply to write changes.`);
  process.exit(0);
}
for (const item of changed) {
  await db.update(wardrobeItems).set({ name: item.name, description: item.description, category: item.category, categoryGroup: item.categoryGroup, primaryColor: item.primaryColor, secondaryColors: item.secondaryColors, material: item.material, fit: item.fit, styleTags: item.styleTags, seasons: item.seasons, formality: item.formality, updatedAt: new Date() }).where(eq(wardrobeItems.id, item.id));
}
console.log(`Cleaned ${changed.length} garments.`);
