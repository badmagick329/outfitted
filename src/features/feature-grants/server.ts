import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { userFeatureGrants } from "@/lib/db/schema";
import { conflict, forbidden, notFound } from "@/shared/application-error";
import { getUserAccessById } from "@/features/access/server";
import {
  featureRegistry,
  featureKeySchema,
  getFeatureDefinition,
  type FeatureDefinition,
  type FeatureKey,
} from "./domain/registry";

export { featureRegistry, featureKeySchema } from "./domain/registry";
export type { FeatureDefinition, FeatureKey } from "./domain/registry";

export type FeatureGrantState = FeatureDefinition & {
  remainingUses: number;
  available: boolean;
};

function feature(featureKey: string) {
  return getFeatureDefinition(featureKey);
}

export async function listUserFeatureGrants(userId: string): Promise<FeatureGrantState[]> {
  const grants = await db
    .select({
      featureKey: userFeatureGrants.featureKey,
      remainingUses: userFeatureGrants.remainingUses,
    })
    .from(userFeatureGrants)
    .where(eq(userFeatureGrants.userId, userId));
  const remainingByKey = new Map(grants.map((grant) => [grant.featureKey, grant.remainingUses]));
  return Object.values(featureRegistry).map((definition) => {
    const remainingUses = remainingByKey.get(definition.key) ?? 0;
    return { ...definition, remainingUses, available: remainingUses > 0 };
  });
}

export async function listFeatureGrantsForUsers(userIds: string[]) {
  const states = await Promise.all(
    userIds.map(async (userId) => [userId, await listUserFeatureGrants(userId)] as const),
  );
  return Object.fromEntries(states);
}

export async function grantFeatureUse(actorUserId: string, userId: string, featureKey: string) {
  const definition = feature(featureKey);
  const access = await getUserAccessById(userId);
  if (!access) throw notFound("User not found");
  if (access.isAdmin) throw conflict("Administrators always have this feature available.");
  if (definition.requiresActiveAccount && access.accessStatus !== "active")
    throw forbidden("This member must have an active account before receiving this feature.");
  if (definition.requiresAiAccess && !access.canUseAi)
    throw forbidden("This member needs AI access before receiving this feature.");
  await db
    .insert(userFeatureGrants)
    .values({
      userId,
      featureKey: definition.key,
      remainingUses: definition.grantedUses,
      grantedByUserId: actorUserId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userFeatureGrants.userId, userFeatureGrants.featureKey],
      set: {
        remainingUses: definition.grantedUses,
        grantedByUserId: actorUserId,
        updatedAt: new Date(),
      },
    });
}

export async function revokeFeatureGrant(userId: string, featureKey: string) {
  const definition = feature(featureKey);
  await db
    .delete(userFeatureGrants)
    .where(
      and(eq(userFeatureGrants.userId, userId), eq(userFeatureGrants.featureKey, definition.key)),
    );
}

export async function hasAvailableFeatureGrant(userId: string, featureKey: string) {
  const definition = feature(featureKey);
  const [grant] = await db
    .select({ remainingUses: userFeatureGrants.remainingUses })
    .from(userFeatureGrants)
    .where(
      and(eq(userFeatureGrants.userId, userId), eq(userFeatureGrants.featureKey, definition.key)),
    )
    .limit(1);
  return (grant?.remainingUses ?? 0) > 0;
}

export async function claimFeatureUse(userId: string, featureKey: string) {
  const definition = feature(featureKey);
  const claimed = await db
    .update(userFeatureGrants)
    .set({ remainingUses: sql`${userFeatureGrants.remainingUses} - 1`, updatedAt: new Date() })
    .where(
      and(
        eq(userFeatureGrants.userId, userId),
        eq(userFeatureGrants.featureKey, definition.key),
        gt(userFeatureGrants.remainingUses, 0),
      ),
    )
    .returning({ userId: userFeatureGrants.userId });
  return claimed.length === 1;
}

export async function restoreFeatureUse(userId: string, featureKey: string) {
  const definition = feature(featureKey);
  await db
    .update(userFeatureGrants)
    .set({ remainingUses: definition.grantedUses, updatedAt: new Date() })
    .where(
      and(
        eq(userFeatureGrants.userId, userId),
        eq(userFeatureGrants.featureKey, definition.key),
        lt(userFeatureGrants.remainingUses, definition.grantedUses),
      ),
    );
}

export function parseFeatureKey(value: unknown): FeatureKey {
  return featureKeySchema.parse(value);
}
