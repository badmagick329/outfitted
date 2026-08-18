import { z } from "zod";

export const featureRegistry = {
  bulk_wardrobe_reanalysis: {
    key: "bulk_wardrobe_reanalysis",
    label: "Re-analyse entire wardrobe",
    description: "Grants one bulk re-analysis of the member’s active garments.",
    grantType: "consumable",
    grantedUses: 1,
    requiresActiveAccount: true,
    requiresAiAccess: true,
  },
} as const;

export type FeatureKey = keyof typeof featureRegistry;
export type FeatureDefinition = (typeof featureRegistry)[FeatureKey];

export const featureKeySchema = z.enum(["bulk_wardrobe_reanalysis"]);

export function getFeatureDefinition(featureKey: string): FeatureDefinition {
  return featureRegistry[featureKeySchema.parse(featureKey)];
}
