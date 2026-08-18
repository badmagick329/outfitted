import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accessAuditEvents, users } from "@/lib/db/schema";
import { forbidden, notFound, unauthorized } from "@/shared/application-error";
import type { AccessStatus, FeatureTier, UpdateUserAccessInput } from "./contracts";
import { asAccessStatus, asFeatureTier, normalizeEmail, resolveAccountAccess } from "./policy";

export type CurrentAccess = {
  userId: string;
  email: string;
  name: string | null;
  accessStatus: AccessStatus;
  featureTier: FeatureTier;
  isAdmin: boolean;
  canUseAi: boolean;
};

function adminEmails() {
  const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean);
  if (process.env.NODE_ENV === "production" && !emails.length)
    throw new Error("ADMIN_EMAILS must contain at least one email address in production.");
  return new Set(emails);
}

export async function getCurrentAccess(): Promise<CurrentAccess | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) return null;
  const resolved = resolveAccountAccess(user, adminEmails());
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    ...resolved,
  };
}

export async function getUserAccessById(userId: string): Promise<CurrentAccess | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const resolved = resolveAccountAccess(user, adminEmails());
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    ...resolved,
  };
}

export async function requireActiveUser() {
  const access = await getCurrentAccess();
  if (!access) throw unauthorized();
  if (access.accessStatus !== "active") throw forbidden("Your account has not been approved.");
  return access;
}

export async function requireAiUser() {
  const access = await requireActiveUser();
  if (!access.canUseAi) throw forbidden("AI features are not enabled for your account.");
  return access;
}

export async function requireAdminUser() {
  const access = await requireActiveUser();
  if (!access.isAdmin) throw forbidden("Administrator access is required.");
  return access;
}

export async function hasAiAccess(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return false;
  return (
    adminEmails().has(normalizeEmail(user.email)) ||
    (asAccessStatus(user.accessStatus) === "active" && asFeatureTier(user.featureTier) === "ai")
  );
}

export async function listManagedUsers() {
  const rows = await db.select().from(users).orderBy(asc(users.createdAt));
  return rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    accessStatus: asAccessStatus(user.accessStatus),
    featureTier: asFeatureTier(user.featureTier),
    isAdmin: adminEmails().has(normalizeEmail(user.email)),
  }));
}

export async function listAccessAuditEvents() {
  const actor = alias(users, "audit_actor");
  const target = alias(users, "audit_target");
  return db
    .select({
      id: accessAuditEvents.id,
      createdAt: accessAuditEvents.createdAt,
      previousAccessStatus: accessAuditEvents.previousAccessStatus,
      nextAccessStatus: accessAuditEvents.nextAccessStatus,
      previousFeatureTier: accessAuditEvents.previousFeatureTier,
      nextFeatureTier: accessAuditEvents.nextFeatureTier,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: target.name,
      targetEmail: target.email,
    })
    .from(accessAuditEvents)
    .innerJoin(actor, eq(accessAuditEvents.actorUserId, actor.id))
    .innerJoin(target, eq(accessAuditEvents.userId, target.id))
    .orderBy(desc(accessAuditEvents.createdAt));
}

export async function updateManagedUser(
  actorUserId: string,
  userId: string,
  input: UpdateUserAccessInput,
) {
  await db.transaction(async (transaction) => {
    const [user] = await transaction.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw notFound("User not found");
    const previousAccessStatus = asAccessStatus(user.accessStatus);
    const previousFeatureTier = asFeatureTier(user.featureTier);
    if (previousAccessStatus === input.accessStatus && previousFeatureTier === input.featureTier)
      return;
    await transaction
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(users.id, userId)));
    await transaction.insert(accessAuditEvents).values({
      userId,
      actorUserId,
      previousAccessStatus,
      nextAccessStatus: input.accessStatus,
      previousFeatureTier,
      nextFeatureTier: input.featureTier,
    });
  });
}
