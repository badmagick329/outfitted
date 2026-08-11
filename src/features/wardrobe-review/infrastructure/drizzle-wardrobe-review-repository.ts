import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { wardrobeReviews } from "@/lib/db/schema";
import { wardrobeReviewReportSchema, wardrobeReviewStatusSchema } from "../domain/contracts";
import type {
  ReviewSnapshot,
  WardrobeReviewRecord,
  WardrobeReviewRepository,
} from "../domain/repository";

function asRecord(row: typeof wardrobeReviews.$inferSelect): WardrobeReviewRecord {
  return {
    ...row,
    status: wardrobeReviewStatusSchema.parse(row.status),
    report: row.report ? wardrobeReviewReportSchema.parse(row.report) : null,
  };
}

export class DrizzleWardrobeReviewRepository implements WardrobeReviewRepository {
  async createPending(ownerId: string, snapshot: ReviewSnapshot) {
    const [created] = await db
      .insert(wardrobeReviews)
      .values({ userId: ownerId, ...snapshot })
      .onConflictDoNothing()
      .returning();
    if (created) return { review: asRecord(created), created: true };

    const [active] = await db
      .select()
      .from(wardrobeReviews)
      .where(
        and(
          eq(wardrobeReviews.userId, ownerId),
          inArray(wardrobeReviews.status, ["pending", "processing"]),
        ),
      )
      .orderBy(desc(wardrobeReviews.createdAt))
      .limit(1);
    if (!active) throw new Error("Unable to locate the active wardrobe review.");
    return { review: asRecord(active), created: false };
  }

  async findLatestOwned(ownerId: string) {
    const [review] = await db
      .select()
      .from(wardrobeReviews)
      .where(eq(wardrobeReviews.userId, ownerId))
      .orderBy(desc(wardrobeReviews.createdAt))
      .limit(1);
    return review ? asRecord(review) : null;
  }

  async findById(reviewId: string) {
    const [review] = await db
      .select()
      .from(wardrobeReviews)
      .where(eq(wardrobeReviews.id, reviewId))
      .limit(1);
    return review ? asRecord(review) : null;
  }

  async setProcessing(reviewId: string, snapshot: ReviewSnapshot) {
    await db
      .update(wardrobeReviews)
      .set({
        ...snapshot,
        status: "processing",
        report: null,
        error: null,
        startedAt: new Date(),
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(wardrobeReviews.id, reviewId));
  }

  async complete(reviewId: string, report: Parameters<WardrobeReviewRepository["complete"]>[1]) {
    await db
      .update(wardrobeReviews)
      .set({
        status: "complete",
        report,
        error: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(wardrobeReviews.id, reviewId));
  }

  async fail(reviewId: string, message: string) {
    await db
      .update(wardrobeReviews)
      .set({
        status: "failed",
        error: message.slice(0, 1000),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(wardrobeReviews.id, reviewId));
  }
}
