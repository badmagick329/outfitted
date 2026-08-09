import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { itemPhotos, wardrobeItems } from "@/lib/db/schema";

export async function getActiveItems(userId: string) {
  return db
    .select()
    .from(wardrobeItems)
    .where(and(eq(wardrobeItems.userId, userId), isNull(wardrobeItems.archivedAt)))
    .orderBy(desc(wardrobeItems.createdAt));
}
export async function getWardrobeWithPhotos(userId: string) {
  const items = await getActiveItems(userId);
  return Promise.all(
    items.map(async (item) => ({ ...item, photos: await getOwnedPhotos(userId, item.id) })),
  );
}
export async function getOwnedItem(userId: string, id: string) {
  const [item] = await db
    .select()
    .from(wardrobeItems)
    .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, userId)))
    .limit(1);
  return item ?? null;
}
export async function getOwnedPhotos(userId: string, itemId: string) {
  return db
    .select({ id: itemPhotos.id, storageKey: itemPhotos.storageKey, position: itemPhotos.position })
    .from(itemPhotos)
    .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
    .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, userId)));
}
