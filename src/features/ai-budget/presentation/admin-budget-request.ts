import { z } from "zod";
import { budgetAmountSchema } from "../domain/contracts";

export const adminBudgetRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("default"), amountMicrousd: budgetAmountSchema }).strict(),
  z
    .object({
      action: z.literal("override"),
      userIds: z
        .array(z.string().min(1).max(200))
        .min(1)
        .max(1000)
        .refine((ids) => new Set(ids).size === ids.length, "Select each member once."),
      amountMicrousd: budgetAmountSchema.nullable(),
    })
    .strict(),
]);
