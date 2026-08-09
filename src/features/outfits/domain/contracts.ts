import { z } from "zod";

export const createOutfitSuggestionSchema = z
  .object({
    prompt: z.string().trim().min(3).max(1000),
    selectedItemId: z.string().uuid().optional(),
  })
  .strict();

export const saveOutfitSchema = z
  .object({ suggestionId: z.string().uuid(), name: z.string().trim().min(1).max(160) })
  .strict();

export type CreateOutfitSuggestionInput = z.infer<typeof createOutfitSuggestionSchema>;
export type SaveOutfitInput = z.infer<typeof saveOutfitSchema>;
