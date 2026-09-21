import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { NotificationRecipient } from "../domain/contracts";

/**
 * Reads the profile the worker is allowed to describe in a notification. Returning null
 * for a deleted user lets the worker complete the job without sending anything.
 */
export async function findNotificationRecipient(
  userId: string,
): Promise<NotificationRecipient | null> {
  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      firstGarmentAddedAt: users.firstGarmentAddedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}
