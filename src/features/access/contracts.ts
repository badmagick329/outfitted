import { z } from "zod";

export const accessStatusSchema = z.enum(["pending", "active", "disabled"]);
export const featureTierSchema = z.enum(["inventory", "ai"]);
export const accessModeSchema = z.enum(["public", "private"]);

export const updateUserAccessSchema = z
  .object({ accessStatus: accessStatusSchema, featureTier: featureTierSchema })
  .strict();

export const updateAccessModeSchema = z.object({ accessMode: accessModeSchema }).strict();

export const bulkUserAccessSchema = z
  .object({
    userIds: z.array(z.string().min(1).max(200)).min(1).max(1000),
    accessStatus: accessStatusSchema.optional(),
    featureTier: featureTierSchema.optional(),
  })
  .strict()
  .refine((value) => value.accessStatus !== undefined || value.featureTier !== undefined, {
    message: "Choose an access or AI access change.",
  })
  .refine((value) => new Set(value.userIds).size === value.userIds.length, {
    message: "Select each member once.",
  });

export type AccessStatus = z.infer<typeof accessStatusSchema>;
export type FeatureTier = z.infer<typeof featureTierSchema>;
export type AccessMode = z.infer<typeof accessModeSchema>;
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;
export type UpdateAccessModeInput = z.infer<typeof updateAccessModeSchema>;
