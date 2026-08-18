import { z } from "zod";
import { categoryGroupSchema, detailedCategorySchema, formalitySchema } from "./category-groups";
import { isSupportedPhoto, maxPhotoSizeBytes, maxPhotosPerGarment } from "./photo-files";

export const wardrobeItemIdSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const uploadPhotosSchema = z
  .array(z.instanceof(File))
  .min(1, "Choose at least one photo.")
  .max(maxPhotosPerGarment, "Upload no more than six photos.")
  .superRefine((files, context) => {
    for (const [index, file] of files.entries()) {
      if (!isSupportedPhoto(file))
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Choose JPG, PNG, HEIC, or WebP photos.",
        });
      if (file.size > maxPhotoSizeBytes)
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Each file must be under 12MB.",
        });
    }
  });

export const replacePhotoSchema = z
  .array(z.instanceof(File))
  .length(1, "Choose one photo.")
  .pipe(uploadPhotosSchema.max(1));

export const photoActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set-cover") }).strict(),
  z.object({ action: z.literal("rotate"), direction: z.enum(["left", "right"]) }).strict(),
]);

export type PhotoAction = z.infer<typeof photoActionSchema>;

export const updateWardrobeItemSchema = z
  .object({
    name: z.string().trim().max(160).optional(),
    description: optionalText(5000),
    category: detailedCategorySchema.nullable().optional(),
    categoryGroup: categoryGroupSchema.nullable().optional(),
    primaryColor: optionalText(64),
    secondaryColors: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
    material: optionalText(128),
    fit: optionalText(128),
    styleTags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
    seasons: z.array(z.string().trim().min(1).max(32)).max(8).optional(),
    formality: formalitySchema.nullable().optional(),
    archivedAt: z.string().datetime().nullable().optional(),
    excludedFromOutfitSuggestions: z.boolean().optional(),
  })
  .strict();

export type UpdateWardrobeItemInput = z.infer<typeof updateWardrobeItemSchema>;
