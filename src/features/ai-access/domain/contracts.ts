import { z } from "zod";

export const aiAccessRequestStatusSchema = z.enum(["pending", "approved", "declined"]);

export const submitAiAccessRequestSchema = z.object({}).strict();

export const resolveAiAccessRequestSchema = z
  .object({ decision: z.enum(["approved", "declined"]) })
  .strict();

export type AiAccessRequestStatus = z.infer<typeof aiAccessRequestStatusSchema>;
export type ResolveAiAccessRequestInput = z.infer<typeof resolveAiAccessRequestSchema>;
