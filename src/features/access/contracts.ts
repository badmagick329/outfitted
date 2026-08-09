import { z } from "zod";

export const accessStatusSchema = z.enum(["pending", "active", "disabled"]);
export const featureTierSchema = z.enum(["inventory", "ai"]);

export const updateUserAccessSchema = z
  .object({ accessStatus: accessStatusSchema, featureTier: featureTierSchema })
  .strict();

export type AccessStatus = z.infer<typeof accessStatusSchema>;
export type FeatureTier = z.infer<typeof featureTierSchema>;
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;
