import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { itemPhotos, users, wardrobeItems } from "@/lib/db/schema";
import { inferCategoryGroup } from "../domain/category-groups";
import type { UpdateWardrobeItemInput } from "../domain/contracts";
import type { AnalysisStatus, WardrobeCard, WardrobeRepository } from "../domain/repository";
import type { ProcessedPhoto } from "../domain/ports";
import type { WardrobeAnalysis } from "@/lib/ai";

export class DrizzleWardrobeRepository implements WardrobeRepository {
  async create(
    ownerId: string,
    photos: ProcessedPhoto[],
    analysisStatus: "pending" | "not_requested",
  ) {
    return db.transaction(async (transaction) => {
      const [item] = await transaction
        .insert(wardrobeItems)
        .values({ userId: ownerId, name: "", analysisStatus })
        .returning();
      await transaction.insert(itemPhotos).values(
        photos.map((photo) => ({
          itemId: item.id,
          storageKey: photo.key,
          contentHash: photo.contentHash,
          width: photo.width,
          height: photo.height,
          position: photo.position,
        })),
      );
      return item;
    });
  }

  async findOwned(ownerId: string, itemId: string) {
    const [item] = await db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)))
      .limit(1);
    return item ?? null;
  }

  async findById(itemId: string) {
    const [item] = await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.id, itemId))
      .limit(1);
    return item ?? null;
  }

  listActive(ownerId: string) {
    return db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.userId, ownerId), isNull(wardrobeItems.archivedAt)))
      .orderBy(desc(wardrobeItems.createdAt));
  }

  async listArchivedCards(ownerId: string): Promise<WardrobeCard[]> {
    const photoCounts = db
      .select({
        itemId: itemPhotos.itemId,
        photoCount: sql<number>`count(*)`.mapWith(Number).as("photo_count"),
      })
      .from(itemPhotos)
      .groupBy(itemPhotos.itemId)
      .as("archived_photo_counts");
    const rows = await db
      .select({
        item: wardrobeItems,
        coverPhotoId: itemPhotos.id,
        photoCount: sql<number>`coalesce(${photoCounts.photoCount}, 0)`.mapWith(Number),
      })
      .from(wardrobeItems)
      .leftJoin(
        itemPhotos,
        and(eq(itemPhotos.itemId, wardrobeItems.id), eq(itemPhotos.position, 0)),
      )
      .leftJoin(photoCounts, eq(photoCounts.itemId, wardrobeItems.id))
      .where(and(eq(wardrobeItems.userId, ownerId), isNotNull(wardrobeItems.archivedAt)))
      .orderBy(desc(wardrobeItems.archivedAt));
    return rows.map(({ item, coverPhotoId, photoCount }) => ({
      ...item,
      coverPhotoId,
      photoCount,
    }));
  }

  async listActiveCards(ownerId: string): Promise<WardrobeCard[]> {
    const photoCounts = db
      .select({
        itemId: itemPhotos.itemId,
        photoCount: sql<number>`count(*)`.mapWith(Number).as("photo_count"),
      })
      .from(itemPhotos)
      .groupBy(itemPhotos.itemId)
      .as("active_photo_counts");
    const rows = await db
      .select({
        item: wardrobeItems,
        coverPhotoId: itemPhotos.id,
        photoCount: sql<number>`coalesce(${photoCounts.photoCount}, 0)`.mapWith(Number),
      })
      .from(wardrobeItems)
      .leftJoin(
        itemPhotos,
        and(eq(itemPhotos.itemId, wardrobeItems.id), eq(itemPhotos.position, 0)),
      )
      .leftJoin(photoCounts, eq(photoCounts.itemId, wardrobeItems.id))
      .where(and(eq(wardrobeItems.userId, ownerId), isNull(wardrobeItems.archivedAt)))
      .orderBy(desc(wardrobeItems.createdAt));
    return rows.map(({ item, coverPhotoId, photoCount }) => ({
      ...item,
      coverPhotoId,
      photoCount,
    }));
  }

  listOwnedPhotos(ownerId: string, itemId: string) {
    return db
      .select()
      .from(itemPhotos)
      .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)))
      .orderBy(itemPhotos.position)
      .then((rows) => rows.map((row) => row.item_photos));
  }

  async findOwnedPhoto(ownerId: string, photoId: string) {
    const [row] = await db
      .select({ photo: itemPhotos })
      .from(itemPhotos)
      .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
      .where(and(eq(itemPhotos.id, photoId), eq(wardrobeItems.userId, ownerId)))
      .limit(1);
    return row?.photo ?? null;
  }

  async findOwnedPhotoByContentHash(ownerId: string, contentHash: string) {
    const [row] = await db
      .select({ photo: itemPhotos })
      .from(itemPhotos)
      .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
      .where(and(eq(itemPhotos.contentHash, contentHash), eq(wardrobeItems.userId, ownerId)))
      .limit(1);
    return row?.photo ?? null;
  }

  listPhotos(itemId: string) {
    return db
      .select()
      .from(itemPhotos)
      .where(eq(itemPhotos.itemId, itemId))
      .orderBy(itemPhotos.position);
  }

  async addPhotos(ownerId: string, itemId: string, photos: ProcessedPhoto[]) {
    return db.transaction(async (transaction) => {
      const existing = await transaction
        .select()
        .from(itemPhotos)
        .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
        .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)))
        .orderBy(itemPhotos.position);
      if (!existing.length) throw new Error("Garment not found");
      const offset = existing.length;
      await transaction.insert(itemPhotos).values(
        photos.map((photo, index) => ({
          itemId,
          storageKey: photo.key,
          contentHash: photo.contentHash,
          width: photo.width,
          height: photo.height,
          position: offset + index,
        })),
      );
      await transaction
        .update(wardrobeItems)
        .set({ updatedAt: new Date() })
        .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)));
      return transaction
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, itemId))
        .orderBy(itemPhotos.position);
    });
  }

  async replacePhoto(ownerId: string, photoId: string, photo: ProcessedPhoto) {
    return db.transaction(async (transaction) => {
      const [owned] = await transaction
        .select({ photo: itemPhotos })
        .from(itemPhotos)
        .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
        .where(and(eq(itemPhotos.id, photoId), eq(wardrobeItems.userId, ownerId)))
        .limit(1);
      if (!owned) throw new Error("Photo not found");
      await transaction.delete(itemPhotos).where(eq(itemPhotos.id, photoId));
      await transaction.insert(itemPhotos).values({
        itemId: owned.photo.itemId,
        storageKey: photo.key,
        contentHash: photo.contentHash,
        width: photo.width,
        height: photo.height,
        position: owned.photo.position,
      });
      await transaction
        .update(wardrobeItems)
        .set({ updatedAt: new Date() })
        .where(eq(wardrobeItems.id, owned.photo.itemId));
      return transaction
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, owned.photo.itemId))
        .orderBy(itemPhotos.position);
    });
  }

  async removePhoto(ownerId: string, photoId: string) {
    return db.transaction(async (transaction) => {
      const [owned] = await transaction
        .select({ photo: itemPhotos })
        .from(itemPhotos)
        .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
        .where(and(eq(itemPhotos.id, photoId), eq(wardrobeItems.userId, ownerId)))
        .limit(1);
      if (!owned) throw new Error("Photo not found");
      const photos = await transaction
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, owned.photo.itemId))
        .orderBy(itemPhotos.position);
      if (photos.length <= 1) throw new Error("Cannot remove final photo");
      await transaction.delete(itemPhotos).where(eq(itemPhotos.id, photoId));
      for (const [position, current] of photos.filter((photo) => photo.id !== photoId).entries())
        await transaction.update(itemPhotos).set({ position }).where(eq(itemPhotos.id, current.id));
      await transaction
        .update(wardrobeItems)
        .set({ updatedAt: new Date() })
        .where(eq(wardrobeItems.id, owned.photo.itemId));
      return {
        removed: owned.photo,
        photos: await transaction
          .select()
          .from(itemPhotos)
          .where(eq(itemPhotos.itemId, owned.photo.itemId))
          .orderBy(itemPhotos.position),
      };
    });
  }

  async setMainPhoto(ownerId: string, photoId: string) {
    return db.transaction(async (transaction) => {
      const [owned] = await transaction
        .select({ photo: itemPhotos })
        .from(itemPhotos)
        .innerJoin(wardrobeItems, eq(itemPhotos.itemId, wardrobeItems.id))
        .where(and(eq(itemPhotos.id, photoId), eq(wardrobeItems.userId, ownerId)))
        .limit(1);
      if (!owned) throw new Error("Photo not found");
      const reordered = [
        (
          await transaction
            .select()
            .from(itemPhotos)
            .where(eq(itemPhotos.itemId, owned.photo.itemId))
            .orderBy(itemPhotos.position)
        ).find((photo) => photo.id === photoId)!,
        ...(
          await transaction
            .select()
            .from(itemPhotos)
            .where(eq(itemPhotos.itemId, owned.photo.itemId))
            .orderBy(itemPhotos.position)
        ).filter((photo) => photo.id !== photoId),
      ];
      for (const [position, photo] of reordered.entries())
        await transaction.update(itemPhotos).set({ position }).where(eq(itemPhotos.id, photo.id));
      await transaction
        .update(wardrobeItems)
        .set({ updatedAt: new Date() })
        .where(eq(wardrobeItems.id, owned.photo.itemId));
      return transaction
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, owned.photo.itemId))
        .orderBy(itemPhotos.position);
    });
  }

  listInProgress(ownerId: string): Promise<AnalysisStatus[]> {
    return db
      .select({
        id: wardrobeItems.id,
        status: wardrobeItems.analysisStatus,
        updatedAt: wardrobeItems.updatedAt,
      })
      .from(wardrobeItems)
      .where(
        and(
          eq(wardrobeItems.userId, ownerId),
          inArray(wardrobeItems.analysisStatus, ["pending", "processing"]),
        ),
      );
  }

  async updateOwned(ownerId: string, itemId: string, values: UpdateWardrobeItemInput) {
    const categoryGroup =
      values.categoryGroup === undefined && values.category !== undefined
        ? inferCategoryGroup(values.category)
        : values.categoryGroup;
    await db
      .update(wardrobeItems)
      .set({
        ...values,
        categoryGroup,
        archivedAt:
          values.archivedAt === undefined
            ? undefined
            : values.archivedAt === null
              ? null
              : new Date(values.archivedAt),
        metadataEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)));
  }

  async setAnalysisPending(ownerId: string, itemId: string) {
    await db
      .update(wardrobeItems)
      .set({ analysisStatus: "pending", analysisError: null, updatedAt: new Date() })
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)));
  }

  async reserveAnalysis(ownerId: string, itemId: string) {
    const rows = await db
      .update(wardrobeItems)
      .set({ analysisStatus: "pending", analysisError: null, updatedAt: new Date() })
      .where(
        and(
          eq(wardrobeItems.id, itemId),
          eq(wardrobeItems.userId, ownerId),
          isNull(wardrobeItems.archivedAt),
          sql`${wardrobeItems.analysisStatus} not in ('pending', 'processing')`,
        ),
      )
      .returning({ id: wardrobeItems.id });
    return rows.length === 1;
  }

  async setAnalysisNotRequested(itemId: string) {
    await db
      .update(wardrobeItems)
      .set({ analysisStatus: "not_requested", analysisError: null, updatedAt: new Date() })
      .where(eq(wardrobeItems.id, itemId));
  }

  async setAnalysisProcessing(itemId: string) {
    await db
      .update(wardrobeItems)
      .set({ analysisStatus: "processing", analysisError: null, updatedAt: new Date() })
      .where(eq(wardrobeItems.id, itemId));
  }

  async completeAnalysis(itemId: string, result: WardrobeAnalysis, forceOverwrite: boolean) {
    const item = await this.findById(itemId);
    if (!item) return;
    await db
      .update(wardrobeItems)
      .set(
        !forceOverwrite && Boolean(item.metadataEditedAt)
          ? { analysisStatus: "complete", analysisError: null, updatedAt: new Date() }
          : {
              ...result,
              name: forceOverwrite ? result.name : item.name ? item.name : result.name,
              material: result.material ?? null,
              fit: result.fit ?? null,
              analysisStatus: "complete",
              analysisError: null,
              metadataEditedAt: forceOverwrite ? null : item.metadataEditedAt,
              updatedAt: new Date(),
            },
      )
      .where(eq(wardrobeItems.id, itemId));
  }

  async failAnalysis(itemId: string, message: string) {
    await db
      .update(wardrobeItems)
      .set({
        analysisStatus: "failed",
        analysisError: message.slice(0, 1000),
        updatedAt: new Date(),
      })
      .where(eq(wardrobeItems.id, itemId));
  }

  async deleteOwned(ownerId: string, itemId: string) {
    await db
      .delete(wardrobeItems)
      .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, ownerId)));
  }

  async claimFirstGarmentMilestone(ownerId: string) {
    const rows = await db
      .update(users)
      .set({ firstGarmentAddedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, ownerId), isNull(users.firstGarmentAddedAt)))
      .returning({ id: users.id });
    return rows.length === 1;
  }
}
