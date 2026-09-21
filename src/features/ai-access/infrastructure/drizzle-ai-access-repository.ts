import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessAuditEvents, aiAccessRequests, users } from "@/lib/db/schema";
import { asAccessStatus, asFeatureTier } from "@/features/access/policy";
import { aiAccessRequestStatusSchema } from "../domain/contracts";
import type {
  AiAccessRequestRecord,
  AiAccessRequestRepository,
  AiAccessRequestResolution,
  PendingAiAccessRequest,
} from "../domain/repository";

function asRecord(row: typeof aiAccessRequests.$inferSelect): AiAccessRequestRecord {
  return { ...row, status: aiAccessRequestStatusSchema.parse(row.status) };
}

export class DrizzleAiAccessRequestRepository implements AiAccessRequestRepository {
  async findLatestForUser(userId: string) {
    const [row] = await db
      .select()
      .from(aiAccessRequests)
      .where(eq(aiAccessRequests.userId, userId))
      .orderBy(desc(aiAccessRequests.createdAt))
      .limit(1);
    return row ? asRecord(row) : null;
  }

  async createPending(userId: string) {
    const [created] = await db
      .insert(aiAccessRequests)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    if (created) return { request: asRecord(created), created: true };

    const [existing] = await db
      .select()
      .from(aiAccessRequests)
      .where(and(eq(aiAccessRequests.userId, userId), eq(aiAccessRequests.status, "pending")))
      .orderBy(desc(aiAccessRequests.createdAt))
      .limit(1);
    if (!existing) throw new Error("Unable to locate the pending AI access request.");
    return { request: asRecord(existing), created: false };
  }

  async listPending(): Promise<PendingAiAccessRequest[]> {
    const rows = await db
      .select({
        id: aiAccessRequests.id,
        userId: aiAccessRequests.userId,
        status: aiAccessRequests.status,
        resolvedByUserId: aiAccessRequests.resolvedByUserId,
        resolvedAt: aiAccessRequests.resolvedAt,
        createdAt: aiAccessRequests.createdAt,
        updatedAt: aiAccessRequests.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(aiAccessRequests)
      .innerJoin(users, eq(aiAccessRequests.userId, users.id))
      .where(eq(aiAccessRequests.status, "pending"))
      .orderBy(asc(aiAccessRequests.createdAt));
    return rows.map(({ userName, userEmail, ...row }) => ({
      ...asRecord(row),
      userName,
      userEmail,
    }));
  }

  async approve(requestId: string, actorUserId: string): Promise<AiAccessRequestResolution> {
    return db.transaction(async (transaction) => {
      const [resolved] = await transaction
        .update(aiAccessRequests)
        .set({
          status: "approved",
          resolvedByUserId: actorUserId,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(aiAccessRequests.id, requestId), eq(aiAccessRequests.status, "pending")))
        .returning({ userId: aiAccessRequests.userId });
      if (!resolved) return "not_pending";

      const [user] = await transaction
        .select()
        .from(users)
        .where(eq(users.id, resolved.userId))
        .limit(1);
      if (!user) throw new Error("Unable to locate the requesting member.");

      const previousAccessStatus = asAccessStatus(user.accessStatus);
      const previousFeatureTier = asFeatureTier(user.featureTier);
      await transaction
        .update(users)
        .set({ featureTier: "ai", updatedAt: new Date() })
        .where(eq(users.id, user.id));
      await transaction.insert(accessAuditEvents).values({
        userId: user.id,
        actorUserId,
        previousAccessStatus,
        nextAccessStatus: previousAccessStatus,
        previousFeatureTier,
        nextFeatureTier: "ai",
      });
      return "resolved";
    });
  }

  async decline(requestId: string, actorUserId: string): Promise<AiAccessRequestResolution> {
    const [resolved] = await db
      .update(aiAccessRequests)
      .set({
        status: "declined",
        resolvedByUserId: actorUserId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(aiAccessRequests.id, requestId), eq(aiAccessRequests.status, "pending")))
      .returning({ id: aiAccessRequests.id });
    return resolved ? "resolved" : "not_pending";
  }
}
