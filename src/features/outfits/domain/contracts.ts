import { z } from "zod";

export const createOutfitSuggestionSchema = z
  .object({
    prompt: z.string().trim().min(3).max(1000),
    selectedItemId: z.string().uuid().optional(),
  })
  .strict();

export const saveOutfitSchema = z
  .object({
    suggestionId: z.string().uuid(),
    name: z.string().trim().min(1).max(160),
    recommendation: z.string().trim().min(1).max(5000),
    rationale: z.string().trim().max(3000).nullable(),
    referencedItemIds: z
      .array(z.string().uuid())
      .min(1)
      .max(20)
      .refine((itemIds) => new Set(itemIds).size === itemIds.length, {
        message: "Each garment can appear only once.",
      }),
  })
  .strict();

export const savedOutfitIdSchema = z.string().uuid();

export const ignoreOutfitSchema = saveOutfitSchema.omit({ name: true });

export type CreateOutfitSuggestionInput = z.infer<typeof createOutfitSuggestionSchema>;
export type SaveOutfitInput = z.infer<typeof saveOutfitSchema>;
export type IgnoreOutfitInput = z.infer<typeof ignoreOutfitSchema>;
