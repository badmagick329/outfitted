import { z } from "zod";
import type { RecordAiUsageInput } from "@/features/ai-usage/domain/contracts";

export const DEFAULT_AI_BUDGET_MICROUSD = 5_000_000;
export const budgetAmountSchema = z.number().int().min(0).max(2_147_483_647);
export type BudgetClock = { now(): Date };
export type AiBudgetPeriod = { key: string; startsAt: Date; endsAt: Date };
export type AiBudgetSnapshot = {
  userId: string;
  period: AiBudgetPeriod;
  defaultLimitMicrousd: number;
  overrideLimitMicrousd: number | null;
  limitMicrousd: number;
  spentMicrousd: number;
  reservedMicrousd: number;
  availableMicrousd: number;
};
export type AiBudgetReservationStatus =
  "reserved" | "dispatched" | "uncertain" | "settled" | "released";
export type AiBudgetReservation = {
  id: string;
  userId: string;
  operation: RecordAiUsageInput["operation"];
  model: string;
  period: AiBudgetPeriod;
  amountMicrousd: number;
  actualCostMicrousd: number | null;
  status: AiBudgetReservationStatus;
  createdAt: Date;
  updatedAt: Date;
};
export type ReserveAiBudgetInput = {
  userId: string;
  operation: RecordAiUsageInput["operation"];
  model: string;
  amountMicrousd: number;
  period: AiBudgetPeriod;
  now: Date;
};
export type ReserveAiBudgetResult =
  | { allowed: true; reservation: AiBudgetReservation }
  | { allowed: false; budget: AiBudgetSnapshot };
export type SettleAiBudgetInput = {
  reservationId: string;
  usageEvent: RecordAiUsageInput;
  now: Date;
};

export function budgetSnapshot(
  input: Omit<AiBudgetSnapshot, "limitMicrousd" | "availableMicrousd">,
): AiBudgetSnapshot {
  const limitMicrousd = input.overrideLimitMicrousd ?? input.defaultLimitMicrousd;
  return {
    ...input,
    limitMicrousd,
    availableMicrousd: Math.max(0, limitMicrousd - input.spentMicrousd - input.reservedMicrousd),
  };
}
