import { z } from "zod";
import { isSupportedPhoto } from "./photo-files";

export const wardrobeItemIdSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const uploadPhotosSchema = z
  .array(z.instanceof(File))
  .min(1, "Choose at least one photo.")
  .max(6, "Upload no more than six photos.")
  .superRefine((files, context) => {
    for (const [index, file] of files.entries()) {
      if (!isSupportedPhoto(file))
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Choose JPG, PNG, HEIC, or WebP photos.",
        });
      if (file.size > 12 * 1024 * 1024)
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Each file must be under 12MB.",
        });
    }
  });

export const updateWardrobeItemSchema = z
  .object({
    name: z.string().trim().max(160).optional(),
    description: optionalText(5000),
    category: optionalText(64),
    primaryColor: optionalText(64),
    secondaryColors: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
    material: optionalText(128),
    fit: optionalText(128),
    styleTags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
    seasons: z.array(z.string().trim().min(1).max(32)).max(8).optional(),
    formality: optionalText(64),
    archivedAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export type UpdateWardrobeItemInput = z.infer<typeof updateWardrobeItemSchema>;
