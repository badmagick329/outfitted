import { z } from "zod";
import type { CategoryGroup } from "@/features/wardrobe/domain/category-groups";

export const wardrobeReviewStatusSchema = z.enum(["pending", "processing", "complete", "failed"]);
export type WardrobeReviewStatus = z.infer<typeof wardrobeReviewStatusSchema>;

export const wardrobeReviewEntrySchema = z.object({
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().min(1).max(600),
  itemIds: z.array(z.string().uuid()).max(6),
});
export type WardrobeReviewEntry = z.infer<typeof wardrobeReviewEntrySchema>;

export const wardrobeReviewReportSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  strengths: z.array(wardrobeReviewEntrySchema).max(4),
  gaps: z.array(wardrobeReviewEntrySchema).max(4),
  observations: z.array(wardrobeReviewEntrySchema).max(4),
});
export type WardrobeReviewReport = z.infer<typeof wardrobeReviewReportSchema>;

export type WardrobeReviewSourceItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  categoryGroup: CategoryGroup | null;
  primaryColor: string | null;
  secondaryColors: string[];
  material: string | null;
  fit: string | null;
  styleTags: string[];
  seasons: string[];
  formality: string | null;
  analysisStatus: string;
  updatedAt: Date;
  coverPhotoId: string | null;
};

export type WardrobeReviewReferencedItem = {
  id: string;
  name: string;
  category: string | null;
  coverPhotoId: string | null;
};

export type WardrobeReviewView = {
  currentItemCount: number;
  currentHasStyleProfile: boolean;
  review: null | {
    id: string;
    status: WardrobeReviewStatus;
    report: WardrobeReviewReport | null;
    reviewedItemCount: number;
    usedStyleProfile: boolean;
    isStale: boolean;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
    referencedItems: WardrobeReviewReferencedItem[];
  };
};
