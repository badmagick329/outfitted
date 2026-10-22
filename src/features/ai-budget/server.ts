import { getUserAccessById } from "@/features/access/server";
import { AiBudgetService } from "./application/ai-budget-service";
import { DrizzleAiBudgetRepository } from "./infrastructure/drizzle-ai-budget-repository";

export const aiBudgetRepository = new DrizzleAiBudgetRepository();
const service = new AiBudgetService(aiBudgetRepository, async (actorUserId) => {
  const access = await getUserAccessById(actorUserId);
  return access?.accessStatus === "active" && access.isAdmin;
});

export const getDefaultAiBudget = () => service.getDefaultLimit();
export const listAiBudgetAuditEvents = () => aiBudgetRepository.listAuditEvents();
export const getAiBudgets = (userIds: string[]) => service.getBudgets(userIds);
export const getAiBudget = async (userId: string) =>
  (await service.getBudgets([userId]))[0] ?? null;
export const setDefaultAiBudget = (actorUserId: string, amount: unknown) =>
  service.setDefaultLimit(actorUserId, amount);
export const setMemberAiBudgetOverride = (actorUserId: string, userId: string, amount: unknown) =>
  service.setMemberOverride(actorUserId, userId, amount);
