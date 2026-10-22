import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { featureRuns, userFeatureGrants } from "@/lib/db/schema";
import { conflict, forbidden } from "@/shared/application-error";
import type { FeatureKey } from "../domain/registry";

export class DrizzleFeatureRunRepository {
  constructor(private readonly database: typeof db = db) {}

  /** Holds the grant while queueing; provider admission permanently consumes it. */
  async begin(userId: string, featureKey: FeatureKey, itemIds: string[]) {
    if (!itemIds.length) throw conflict("No active garments to re-analyse.");
    return this.database.transaction(async (transaction) => {
      const [claimed] = await transaction
        .update(userFeatureGrants)
        .set({ remainingUses: sql`${userFeatureGrants.remainingUses} - 1`, updatedAt: new Date() })
        .where(
          and(
            eq(userFeatureGrants.userId, userId),
            eq(userFeatureGrants.featureKey, featureKey),
            gt(userFeatureGrants.remainingUses, 0),
          ),
        )
        .returning();
      if (!claimed) throw forbidden("Your one re-analysis grant has already been used.");
      const [run] = await transaction
        .insert(featureRuns)
        .values({
          userId,
          featureKey,
          pendingItemIds: itemIds,
          grantGeneration: claimed.generation,
        })
        .returning();
      return run.id;
    });
  }

  async admit(runId: string) {
    const [run] = await this.database
      .update(featureRuns)
      .set({ admittedAt: sql`coalesce(${featureRuns.admittedAt}, now())`, updatedAt: new Date() })
      .where(and(eq(featureRuns.id, runId), isNull(featureRuns.completedAt)))
      .returning({ id: featureRuns.id });
    if (!run) throw conflict("This bulk re-analysis has expired. Please start it again.");
  }

  async completeItem(runId: string, itemId: string) {
    await this.database.transaction(async (transaction) => {
      const [run] = await transaction
        .select()
        .from(featureRuns)
        .where(eq(featureRuns.id, runId))
        .for("update");
      if (!run || run.completedAt) return;
      const pendingItemIds = run.pendingItemIds.filter((id) => id !== itemId);
      await transaction
        .update(featureRuns)
        .set({
          pendingItemIds,
          completedAt: pendingItemIds.length ? null : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(featureRuns.id, runId));
      if (!pendingItemIds.length && !run.admittedAt) {
        // The generation fences older runs from later admin revokes/regrants.
        await transaction
          .update(userFeatureGrants)
          .set({ remainingUses: 1, updatedAt: new Date() })
          .where(
            and(
              eq(userFeatureGrants.userId, run.userId),
              eq(userFeatureGrants.featureKey, run.featureKey),
              eq(userFeatureGrants.remainingUses, 0),
              eq(userFeatureGrants.generation, run.grantGeneration),
            ),
          );
      }
    });
  }

  /** Expired runs cannot dispatch: admit rejects before the provider is called. */
  async recover(before: Date) {
    await this.database.transaction(async (transaction) => {
      const runs = await transaction
        .select()
        .from(featureRuns)
        .where(and(isNull(featureRuns.completedAt), lt(featureRuns.createdAt, before)))
        .for("update");
      for (const run of runs) {
        await transaction
          .update(featureRuns)
          .set({ completedAt: new Date(), pendingItemIds: [], updatedAt: new Date() })
          .where(eq(featureRuns.id, run.id));
        if (!run.admittedAt)
          await transaction
            .update(userFeatureGrants)
            .set({ remainingUses: 1, updatedAt: new Date() })
            .where(
              and(
                eq(userFeatureGrants.userId, run.userId),
                eq(userFeatureGrants.featureKey, run.featureKey),
                eq(userFeatureGrants.remainingUses, 0),
                eq(userFeatureGrants.generation, run.grantGeneration),
              ),
            );
      }
    });
  }
}
